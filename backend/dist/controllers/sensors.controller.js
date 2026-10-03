"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsController = void 0;
const client_1 = require("@prisma/client");
const sensors_service_1 = require("../services/sensors.service");
const prisma = new client_1.PrismaClient();
const svc = new sensors_service_1.SensorsService();
class SensorsController {
    // ── POST /api/sensors/data  (called by ESP32 every 5 s) ──────────────────
    async receiveData(request, reply) {
        const body = request.body;
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
                led: detection.ledCommand, // 'GREEN' | 'YELLOW' | 'RED'
                buzzer: detection.buzzerCommand, // 'OFF' | 'SINGLE_BEEP' | 'TRIPLE_BEEP'
                status: detection.status, // 'GOOD' | 'CAUTION' | 'SPOILED'
                spoilageScore: detection.spoilageScore,
            },
            alerts: detection.alerts,
        });
    }
    // ── GET /api/sensors/status/:deviceId ────────────────────────────────────
    async getDeviceStatus(request, reply) {
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
    async getDeviceHistory(request, reply) {
        const { deviceId } = request.params;
        const limit = Math.min(Number(request.query.limit) || 50, 500);
        const history = await svc.getHistoryByDevice(deviceId, limit);
        return reply.send({ success: true, deviceId, count: history.length, data: history });
    }
    // ── GET /api/sensors/stats/:deviceId ─────────────────────────────────────
    async getDeviceStats(request, reply) {
        const { deviceId } = request.params;
        const stats = await svc.getDeviceStats(deviceId);
        return reply.send({ success: true, deviceId, stats });
    }
    // ── GET /api/sensors/devices ──────────────────────────────────────────────
    async getKnownDevices(_request, reply) {
        const devices = await svc.getKnownDevices();
        return reply.send({ success: true, count: devices.length, devices });
    }
    // ── GET /api/sensors/alerts ───────────────────────────────────────────────
    async getActiveAlerts(_request, reply) {
        const alerts = await svc.getActiveAlerts();
        return reply.send({ success: true, count: alerts.length, alerts });
    }
    // ── PATCH /api/sensors/alerts/:id/resolve ────────────────────────────────
    async resolveAlert(request, reply) {
        const alert = await svc.resolveAlert(request.params.id);
        return reply.send({ success: true, data: alert });
    }
    // ── GET /api/sensors/latest (public / direct IoT latest status) ──────────
    async getLatest(_request, reply) {
        const devices = await svc.getKnownDevices();
        const firstDevice = devices[0] || 'ESP32_FOOD_001';
        const latest = await svc.getLatestByDevice(firstDevice);
        return reply.send({ success: true, deviceId: firstDevice, data: latest });
    }
    // ── GET /api/sensors  (protected — dashboard, shows kitchen sensors & IoT) ──
    async getSensors(request, reply) {
        const user = request.user;
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
        const firstDevice = devices[0] || 'ESP32_FOOD_001';
        const iotLatest = await svc.getLatestByDevice(firstDevice);
        return reply.send({ success: true, data: sensors, iotLatest, deviceId: firstDevice });
    }
}
exports.SensorsController = SensorsController;
//# sourceMappingURL=sensors.controller.js.map