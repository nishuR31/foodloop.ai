import { PrismaClient } from '@prisma/client';
import { SensorsRepository, SensorDataInput } from '../repositories/sensors.repository';
import { getIO } from '../socket';

const prisma = new PrismaClient();

// ── Thresholds (match ESP32 calculateSpoilageScore logic exactly) ────────────
export const THRESHOLDS = {
  // Spoilage score bands (same as ESP32 firmware)
  GOOD_MAX: 30,      // score < 30  → GOOD    (green LED)
  CAUTION_MAX: 60,   // score < 60  → CAUTION (yellow LED + beep)
  // score ≥ 60      → SPOILED (red LED + 3× buzzer)

  // Absolute temperature thresholds (°C)
  TEMP_COLD: 4,      // below 4 °C → cold storage (minimal spoilage risk)
  TEMP_WARM: 30,     // above 30 °C → rapid spoilage risk
  TEMP_DANGER: 60,   // sensor fault or serious HVAC failure

  // Humidity thresholds (%)
  HUM_LOW: 40,       // <40 % → dry (low mould risk)
  HUM_HIGH: 75,      // >75 % → high mould / bacterial growth risk

  // MQ-2 (smoke / combustible gas) — 12-bit ADC (0-4095)
  MQ2_WARN: 1500,    // above → smoke / gas leak warning
  MQ2_CRIT: 2800,    // above → critical gas concentration

  // MQ-3 (alcohol / VOC) — 12-bit ADC
  MQ3_WARN: 1200,    // elevated VOC / fermentation odour
  MQ3_CRIT: 2500,    // strong VOC — likely heavy spoilage
};

export interface DetectionResult {
  status: 'GOOD' | 'CAUTION' | 'SPOILED';
  spoilageScore: number;
  gasIndex: number;
  temperatureIndex: number;
  humidityIndex: number;
  alerts: DetectedAlert[];
  ledCommand: 'GREEN' | 'YELLOW' | 'RED';
  buzzerCommand: 'OFF' | 'SINGLE_BEEP' | 'TRIPLE_BEEP';
}

export interface DetectedAlert {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export class SensorsService {
  private repo = new SensorsRepository();

  // ── Core spoilage calculation (mirrors ESP32 firmware exactly) ─────────────
  static calculateSpoilageScore(
    temp: number,
    hum: number,
    mq2Raw: number,
    mq3Raw: number,
  ): { spoilageScore: number; gasIndex: number; temperatureIndex: number; humidityIndex: number } {
    const gasRaw = mq3Raw * 0.65 + mq2Raw * 0.35;
    let gasIdx: number;
    if (gasRaw <= 450.0) {
      gasIdx = (gasRaw / 450.0) * 15.0;
    } else if (gasRaw <= 1300.0) {
      gasIdx = 15.0 + ((gasRaw - 450.0) / (1300.0 - 450.0)) * 35.0;
    } else if (gasRaw <= 2600.0) {
      gasIdx = 50.0 + ((gasRaw - 1300.0) / (2600.0 - 1300.0)) * 40.0;
    } else {
      gasIdx = 100.0;
    }

    let tempIdx: number;
    if (temp < 4.0) tempIdx = 0.0;
    else if (temp < 15.0) tempIdx = 5.0;
    else if (temp < 25.0) tempIdx = 10.0;
    else if (temp < 32.0) tempIdx = 25.0;
    else tempIdx = 50.0;

    let humIdx: number;
    if (hum < 45.0) humIdx = 5.0;
    else if (hum < 65.0) humIdx = 10.0;
    else if (hum < 75.0) humIdx = 25.0;
    else humIdx = 50.0;

    let spoilageScore = gasIdx * 0.70 + tempIdx * 0.15 + humIdx * 0.15;
    if (spoilageScore > 100) spoilageScore = 100;

    return { spoilageScore, gasIndex: gasIdx, temperatureIndex: tempIdx, humidityIndex: humIdx };
  }

  // ── Full detection pipeline ────────────────────────────────────────────────
  static detect(
    temp: number,
    hum: number,
    mq2Raw: number,
    mq3Raw: number,
    overriddenScore?: number,     // use score supplied by ESP32 when present
    overriddenStatus?: string,
    isHotFood?: boolean,
  ): DetectionResult {
    const calc = this.calculateSpoilageScore(temp, hum, mq2Raw, mq3Raw);
    let spoilageScore = overriddenScore ?? calc.spoilageScore;

    if (isHotFood) {
      // Hot food steam causes transient temp/humidity rises; not spoilage.
      spoilageScore = Math.min(spoilageScore, 20.0);
    }

    // Status determination (same bands as firmware)
    let status: 'GOOD' | 'CAUTION' | 'SPOILED';
    if (!isHotFood && (mq3Raw >= 1500 || mq2Raw >= 1800 || spoilageScore >= 60.0)) status = 'SPOILED';
    else if (!isHotFood && (mq3Raw >= 750 || mq2Raw >= 900 || spoilageScore >= 30.0)) status = 'CAUTION';
    else status = 'GOOD';

    // Use ESP-reported status if provided and consistent (prevents drift when
    // the ESP applies its own hysteresis locally)
    if (overriddenStatus && ['GOOD', 'CAUTION', 'SPOILED'].includes(overriddenStatus)) {
      status = overriddenStatus as 'GOOD' | 'CAUTION' | 'SPOILED';
    }

    // ── LED / Buzzer commands to echo back to ESP32 ────────────────────────
    let ledCommand: DetectionResult['ledCommand'];
    let buzzerCommand: DetectionResult['buzzerCommand'];
    switch (status) {
      case 'GOOD':
        ledCommand = 'GREEN';
        buzzerCommand = 'OFF';
        break;
      case 'CAUTION':
        ledCommand = 'YELLOW';
        buzzerCommand = 'SINGLE_BEEP';
        break;
      case 'SPOILED':
        ledCommand = 'RED';
        buzzerCommand = 'TRIPLE_BEEP';
        break;
    }

    // ── Alert generation ──────────────────────────────────────────────────
    const alerts: DetectedAlert[] = [];

    if (isHotFood) {
      alerts.push({
        title: '[INFO] Fresh Hot Food Detected',
        message: `Temporary temperature (${temp.toFixed(1)}°C) / humidity rise from freshly prepared hot food. Spoilage evaluation normalized.`,
        severity: 'INFO',
      });
    }

    if (status === 'SPOILED') {
      alerts.push({
        title: '[CRITICAL] Food Spoilage Detected',
        message: `Device reports SPOILED — Spoilage Score: ${spoilageScore.toFixed(1)}. Temp: ${temp.toFixed(1)}°C, Humidity: ${hum.toFixed(1)}%, MQ-2: ${mq2Raw}, MQ-3: ${mq3Raw}.`,
        severity: 'CRITICAL',
      });
    } else if (status === 'CAUTION') {
      alerts.push({
        title: '[WARNING] Food Quality Caution',
        message: `Spoilage Score ${spoilageScore.toFixed(1)} — conditions are sub-optimal. Temp: ${temp.toFixed(1)}°C, Humidity: ${hum.toFixed(1)}%.`,
        severity: 'WARNING',
      });
    }

    // Temperature anomalies
    if (temp > THRESHOLDS.TEMP_DANGER) {
      alerts.push({ title: '[CRITICAL] Sensor Fault / Extreme Heat', message: `Temperature ${temp.toFixed(1)}°C exceeds safe operating range.`, severity: 'CRITICAL' });
    } else if (temp > THRESHOLDS.TEMP_WARM && !isHotFood) {
      alerts.push({ title: '[WARNING] High Temperature', message: `Temperature ${temp.toFixed(1)}°C above 30 °C — rapid spoilage conditions.`, severity: 'WARNING' });
    }

    // Humidity anomalies
    if (hum > THRESHOLDS.HUM_HIGH) {
      alerts.push({ title: '[WARNING] High Humidity', message: `Humidity ${hum.toFixed(1)}% above ${THRESHOLDS.HUM_HIGH}% — mould/bacterial growth risk.`, severity: 'WARNING' });
    }

    // Gas anomalies
    if (mq2Raw > THRESHOLDS.MQ2_CRIT) {
      alerts.push({ title: '[CRITICAL] Critical Gas Level (MQ-2)', message: `MQ-2 ADC: ${mq2Raw} — smoke or combustible gas exceeds critical threshold.`, severity: 'CRITICAL' });
    } else if (mq2Raw > THRESHOLDS.MQ2_WARN) {
      alerts.push({ title: '[WARNING] Elevated Smoke/Gas (MQ-2)', message: `MQ-2 ADC: ${mq2Raw} — elevated combustible gas detected.`, severity: 'WARNING' });
    }

    if (mq3Raw > THRESHOLDS.MQ3_CRIT) {
      alerts.push({ title: '[CRITICAL] Critical VOC/Alcohol (MQ-3)', message: `MQ-3 ADC: ${mq3Raw} — strong fermentation / heavy spoilage VOC.`, severity: 'CRITICAL' });
    } else if (mq3Raw > THRESHOLDS.MQ3_WARN) {
      alerts.push({ title: '[WARNING] Elevated VOC (MQ-3)', message: `MQ-3 ADC: ${mq3Raw} — elevated alcohol / VOC detected.`, severity: 'WARNING' });
    }

    return {
      status,
      spoilageScore,
      gasIndex: calc.gasIndex,
      temperatureIndex: calc.temperatureIndex,
      humidityIndex: calc.humidityIndex,
      alerts,
      ledCommand,
      buzzerCommand,
    };
  }

  // ── Ingest ESP32 payload ──────────────────────────────────────────────────
  async ingestSensorData(raw: Record<string, any>) {
    const temp: number = Number(raw.temperature_c ?? raw.temperature ?? raw.temp ?? 0);
    const hum: number  = Number(raw.humidity_pct ?? raw.humidity ?? raw.hum ?? 0);
    const mq2Raw: number = Number(raw.mq2_raw ?? raw.mq2Raw ?? 0);
    const mq3Raw: number = Number(raw.mq3_raw ?? raw.mq3Raw ?? 0);
    const deviceId: string = String(raw.device_id ?? raw.deviceId ?? 'ESP32_FOOD_001');

    // ── Fresh Hot Food Gradual Lowering Slope Analysis ─────────────────────
    // From esp.ino: A fresh hot dish creates a rapid thermal/humidity transient.
    // If the temperature is elevated or was recently elevated, and is gradually lowering
    // towards ambient without volatile decomposition gases (MQ-2 / MQ-3), it is
    // classified as SAFE freshly-cooked food cooling down, NOT spoilage.
    const history = await this.repo.getHistoryByDevice(deviceId, 6);
    const prevTemp = history[0]?.temperature ?? temp;
    const maxRecentTemp = history.length > 0 ? Math.max(...history.map(h => h.temperature)) : temp;

    const gasesClean = mq2Raw < THRESHOLDS.MQ2_WARN && mq3Raw < THRESHOLDS.MQ3_WARN;
    const isGraduallyLowering = (maxRecentTemp >= 28.0 || temp >= 28.0) && (temp <= prevTemp + 0.5) && gasesClean;
    const isHotFood = Boolean(raw.hot_food_event || raw.status_detail === 'HOT_FOOD_TRANSIENT' || isGraduallyLowering);

    const detection = SensorsService.detect(
      temp,
      hum,
      mq2Raw,
      mq3Raw,
      raw.spoilage_score,
      raw.status,
      isHotFood,
    );

    const payload: SensorDataInput = {
      deviceId,
      temperature: temp,
      humidity: hum,
      mq2Raw,
      mq2Mv: raw.mq2_mv ?? null,
      mq3Raw,
      mq3Mv: raw.mq3_mv ?? null,
      gasIndex: detection.gasIndex,
      temperatureIndex: detection.temperatureIndex,
      humidityIndex: detection.humidityIndex,
      spoilageScore: detection.spoilageScore,
      status: detection.status,
    };

    // Persist reading to DB
    const saved = await this.repo.createReading(payload);

    // Persist critical/warning alerts
    for (const alert of detection.alerts) {
      if (alert.severity !== 'INFO') {
        await this.repo.createAlert(alert.title, alert.message, alert.severity).catch(() => null);
      }
    }

    // ── Connect Sensor Processing with Food Inventory, NGO Surplus & Rider Logistics ──
    try {
      if (detection.status === 'GOOD') {
        // Food is SAFE / Fresh! Look for available surplus container linked to this sensor
        const availableSurplus = await prisma.surplus.findFirst({
          where: {
            status: 'AVAILABLE',
            OR: [
              { deviceId: deviceId },
              { deviceId: null }
            ]
          },
          include: { kitchen: true }
        });

        if (availableSurplus) {
          // 1. Assign deviceId and advance surplus to MATCHED
          await prisma.surplus.update({
            where: { id: availableSurplus.id },
            data: { status: 'MATCHED', deviceId: deviceId }
          });

          // 2. Select eligible NGO
          const targetNgo = await prisma.nGO.findFirst();

          if (targetNgo) {
            // 3. Create or update Redistribution
            let redistribution = await prisma.redistribution.findFirst({
              where: { surplusId: availableSurplus.id }
            });

            if (!redistribution) {
              redistribution = await prisma.redistribution.create({
                data: {
                  surplusId: availableSurplus.id,
                  ngoId: targetNgo.id,
                  quantityMatched: availableSurplus.quantitySurplus,
                  status: 'ACCEPTED'
                }
              });
            }

            // 4. Create or ensure Delivery is PENDING (ready for riders to claim)
            let delivery = await prisma.delivery.findUnique({
              where: { redistributionId: redistribution.id }
            });

            if (!delivery) {
              delivery = await prisma.delivery.create({
                data: {
                  redistributionId: redistribution.id,
                  driverId: null,
                  status: 'PENDING'
                }
              });
            }

            // 5. Broadcast to NGO and Rider
            const io = getIO();
            if (io) {
              io.emit('surplus_updated');
              io.emit('delivery_updated', { deliveryId: delivery.id, status: 'PENDING' });
              io.emit('notification', {
                title: '[IoT Verified Safe] Surplus Matched!',
                message: `${availableSurplus.foodItem} verified fresh & safe by sensor node ${deviceId}. Scheduled for ${targetNgo.name}.`
              });
            }
          }
        }
      } else if (detection.status === 'SPOILED') {
        // 1. Mark safe inventory in kitchen as QUALITY_WARNING / EXPIRED
        await prisma.inventoryItem.updateMany({
          where: { status: 'SAFE' },
          data: { status: 'QUALITY_WARNING' }
        }).catch(() => null);

        // 2. Automatically cancel and retract any surplus food linked to this container/kitchen!
        const spoiledSurpluses = await prisma.surplus.findMany({
          where: {
            OR: [
              { deviceId: deviceId },
              { deviceId: null, status: 'AVAILABLE' }
            ],
            status: { in: ['AVAILABLE', 'MATCHED'] }
          },
          include: {
            redistributions: {
              include: { delivery: true }
            }
          }
        });

        for (const s of spoiledSurpluses) {
          await prisma.surplus.update({
            where: { id: s.id },
            data: { status: 'EXPIRED' }
          }).catch(() => null);

          for (const r of s.redistributions) {
            await prisma.redistribution.update({
              where: { id: r.id },
              data: { status: 'CANCELLED' }
            }).catch(() => null);

            if (r.delivery) {
              await prisma.delivery.update({
                where: { id: r.delivery.id },
                data: { status: 'CANCELLED' }
              }).catch(() => null);
            }
          }
        }

        // 3. Broadcast critical safety retraction to kitchen, NGO and riders
        const io = getIO();
        if (io) {
          io.emit('inventory_updated');
          io.emit('surplus_updated');
          io.emit('delivery_updated', { status: 'CANCELLED' });
          io.emit('notification', {
            title: '[CRITICAL SAFETY] Spoilage Detected — Delivery Withdrawn',
            message: `Sensor node ${deviceId} detected decomposition gases. Surplus delivery has been retracted to protect public health.`
          });
        }
      } else if (detection.status === 'CAUTION') {
        // Mark items approaching risk as EXPIRING_SOON
        await prisma.inventoryItem.updateMany({
          where: { status: 'SAFE' },
          data: { status: 'EXPIRING_SOON' }
        }).catch(() => null);

        const io = getIO();
        if (io) {
          io.emit('inventory_updated');
        }
      }
    } catch (err) {
      console.error('Error linking sensor reading to inventory/surplus:', err);
    }

    // Broadcast to all dashboard WebSocket clients
    const io = getIO();
    if (io) {
      io.emit('sensor:data', {
        ...saved,
        ledCommand: detection.ledCommand,
        buzzerCommand: detection.buzzerCommand,
        alerts: detection.alerts,
      });

      if (detection.alerts.length) {
        io.emit('sensor:alert', {
          deviceId,
          status: detection.status,
          alerts: detection.alerts,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { saved, detection };
  }

  async getLatestByDevice(deviceId: string) {
    return this.repo.getLatestByDevice(deviceId);
  }

  async getHistoryByDevice(deviceId: string, limit?: number) {
    return this.repo.getHistoryByDevice(deviceId, limit);
  }

  async getKnownDevices() {
    return this.repo.getKnownDevices();
  }

  async getDeviceStats(deviceId: string) {
    return this.repo.getDeviceStats(deviceId);
  }

  async getActiveAlerts() {
    return this.repo.getActiveAlerts();
  }

  async resolveAlert(id: string) {
    return this.repo.resolveAlert(id);
  }
}
