import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { SensorsService } from '../services/sensors.service';

const prisma = new PrismaClient();

const svc = new SensorsService();

export class SensorsController {
  // ── POST /api/sensors/data  (called by ESP32 every 5 s) ──────────────────
  async receiveData(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as Record<string, any>;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ success: false, error: 'Invalid JSON body' });
    }

    const { saved, detection } = await svc.ingestSensorData(body);

    // Return LED/buzzer command so the ESP32 can override its local decision
    // if the server disagrees (e.g. different threshold configuration).
    return reply.status(201).send({
      success: true,
      message: 'Data received',
      data: saved,
      // ── Commands echoed back to ESP32 ────────────────────────────────
      command: {
        led: detection.ledCommand,       // 'GREEN' | 'YELLOW' | 'RED'
        buzzer: detection.buzzerCommand, // 'OFF' | 'SINGLE_BEEP' | 'TRIPLE_BEEP'
        status: detection.status,        // 'GOOD' | 'CAUTION' | 'SPOILED'
        spoilageScore: detection.spoilageScore,
      },
      alerts: detection.alerts,
    });
  }

  // ── GET /api/sensors/status/:deviceId ────────────────────────────────────
  async getDeviceStatus(
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply,
  ) {
    const { deviceId } = request.params;
    const latest = await svc.getLatestByDevice(deviceId);

    if (!latest) {
      return reply.status(404).send({
        success: false,
        status: 'UNKNOWN',
        message: `No data received yet from device ${deviceId}`,
      });
    }

    return reply.send({
      success: true,
      deviceId,
      status: latest.status,
      spoilageScore: latest.spoilageScore,
      temperature: latest.temperature,
      humidity: latest.humidity,
      mq2Raw: latest.mq2Raw,
      mq3Raw: latest.mq3Raw,
      gasIndex: latest.gasIndex,
      lastSeen: latest.createdAt,
    });
  }

  // ── GET /api/sensors/history/:deviceId?limit=50 ───────────────────────────
  async getDeviceHistory(
    request: FastifyRequest<{ Params: { deviceId: string }; Querystring: { limit?: string } }>,
    reply: FastifyReply,
  ) {
    const { deviceId } = request.params;
    const limit = Math.min(Number(request.query.limit) || 50, 500);
    const history = await svc.getHistoryByDevice(deviceId, limit);
    return reply.send({ success: true, deviceId, count: history.length, data: history });
  }

  // ── GET /api/sensors/stats/:deviceId ─────────────────────────────────────
  async getDeviceStats(
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply,
  ) {
    const { deviceId } = request.params;
    const stats = await svc.getDeviceStats(deviceId);
    return reply.send({ success: true, deviceId, stats });
  }

  // ── GET /api/sensors/devices ──────────────────────────────────────────────
  async getKnownDevices(_request: FastifyRequest, reply: FastifyReply) {
    const devices = await svc.getKnownDevices();
    return reply.send({ success: true, count: devices.length, devices });
  }

  // ── GET /api/sensors/alerts ───────────────────────────────────────────────
  async getActiveAlerts(_request: FastifyRequest, reply: FastifyReply) {
    const alerts = await svc.getActiveAlerts();
    return reply.send({ success: true, count: alerts.length, alerts });
  }

  // ── PATCH /api/sensors/alerts/:id/resolve ────────────────────────────────
  async resolveAlert(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const alert = await svc.resolveAlert(request.params.id);
    return reply.send({ success: true, data: alert });
  }

  // ── GET /api/sensors/latest (public / direct IoT latest status) ──────────
  // ── GET /api/sensors/latest (public / direct IoT latest status) ──────────
  async getLatest(_request: FastifyRequest, reply: FastifyReply) {
    const devices = await svc.getKnownDevices();
    const firstDevice = devices[0];
    let latest = firstDevice ? await svc.getLatestByDevice(firstDevice) : null;
    if (!latest) {
      latest = await prisma.foodSpoilageSensorData.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }
    return reply.send({
      success: true,
      deviceId: latest?.deviceId || firstDevice || 'ESP32_FOOD_001',
      data: latest,
    });
  }

  // ── GET /api/sensors  (protected — dashboard, shows kitchen sensors & IoT) ──
  async getSensors(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;

    let kitchen = user?.organizationId
      ? await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } })
      : null;

    if (!kitchen) {
      kitchen = await prisma.kitchen.findFirst();
    }

    const sensors = kitchen ? await prisma.sensor.findMany({
      where: { kitchenId: kitchen.id },
      include: {
        readings: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    }) : [];

    // Enrich with the latest ESP32 IoT reading
    const devices = await svc.getKnownDevices();
    const firstDevice = devices[0];
    let iotLatest = firstDevice ? await svc.getLatestByDevice(firstDevice) : null;
    if (!iotLatest) {
      iotLatest = await prisma.foodSpoilageSensorData.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    return reply.send({
      success: true,
      data: sensors,
      iotLatest,
      deviceId: iotLatest?.deviceId || firstDevice || 'ESP32_FOOD_001',
    });
  }
}
