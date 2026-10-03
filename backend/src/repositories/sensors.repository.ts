import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SensorDataInput {
  deviceId: string;
  temperature: number;
  humidity: number;
  mq2Raw: number;
  mq2Mv?: number;
  mq3Raw: number;
  mq3Mv?: number;
  gasIndex?: number;
  temperatureIndex?: number;
  humidityIndex?: number;
  spoilageScore: number;
  status: string;
}

export class SensorsRepository {
  /**
   * Persist one sensor reading from ESP32.
   */
  async createReading(data: SensorDataInput) {
    return prisma.foodSpoilageSensorData.create({ data });
  }

  /**
   * Latest reading for a specific device.
   */
  async getLatestByDevice(deviceId: string) {
    return prisma.foodSpoilageSensorData.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * History — most recent N readings, newest first.
   */
  async getHistoryByDevice(deviceId: string, limit = 50) {
    return prisma.foodSpoilageSensorData.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * All unique device IDs seen so far.
   */
  async getKnownDevices(): Promise<string[]> {
    const rows = await prisma.foodSpoilageSensorData.findMany({
      distinct: ['deviceId'],
      select: { deviceId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: { deviceId: string }) => r.deviceId);
  }

  /**
   * Create a persistent alert record.
   */
  async createAlert(title: string, message: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') {
    return prisma.alert.create({ data: { title, message, severity } });
  }

  /**
   * Latest unresolved alerts.
   */
  async getActiveAlerts(limit = 20) {
    return prisma.alert.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async resolveAlert(id: string) {
    return prisma.alert.update({ where: { id }, data: { isResolved: true } });
  }

  /**
   * Aggregate stats across all readings for a device.
   */
  async getDeviceStats(deviceId: string) {
    const agg = await prisma.foodSpoilageSensorData.aggregate({
      where: { deviceId },
      _avg: { temperature: true, humidity: true, spoilageScore: true },
      _max: { spoilageScore: true, temperature: true },
      _min: { temperature: true },
      _count: true,
    });
    return agg;
  }
}
