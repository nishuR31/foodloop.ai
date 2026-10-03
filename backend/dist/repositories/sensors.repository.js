"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SensorsRepository {
    /**
     * Persist one sensor reading from ESP32.
     */
    async createReading(data) {
        return prisma.foodSpoilageSensorData.create({ data });
    }
    /**
     * Latest reading for a specific device.
     */
    async getLatestByDevice(deviceId) {
        return prisma.foodSpoilageSensorData.findFirst({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * History — most recent N readings, newest first.
     */
    async getHistoryByDevice(deviceId, limit = 50) {
        return prisma.foodSpoilageSensorData.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    /**
     * All unique device IDs seen so far.
     */
    async getKnownDevices() {
        const rows = await prisma.foodSpoilageSensorData.findMany({
            distinct: ['deviceId'],
            select: { deviceId: true },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => r.deviceId);
    }
    /**
     * Create a persistent alert record.
     */
    async createAlert(title, message, severity) {
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
    async resolveAlert(id) {
        return prisma.alert.update({ where: { id }, data: { isResolved: true } });
    }
    /**
     * Aggregate stats across all readings for a device.
     */
    async getDeviceStats(deviceId) {
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
exports.SensorsRepository = SensorsRepository;
//# sourceMappingURL=sensors.repository.js.map