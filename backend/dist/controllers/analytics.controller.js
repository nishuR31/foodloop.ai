"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const analyticsService = new analytics_service_1.AnalyticsService();
class AnalyticsController {
    async getImpact(request, reply) {
        const data = await analyticsService.getImpact();
        return reply.send({ success: true, data });
    }
    async getKitchenDashboard(request, reply) {
        const data = await analyticsService.getKitchenDashboard(request.user);
        return reply.send({ success: true, data });
    }
    async getSystemOverview(request, reply) {
        const data = await analyticsService.getSystemOverview(request.user);
        return reply.send({ success: true, data });
    }
    async getActivityTimeline(request, reply) {
        const data = await analyticsService.getActivityTimeline(request.user);
        return reply.send({ success: true, data });
    }
    async getOrganizations(request, reply) {
        const data = await analyticsService.getOrganizations(request.user);
        return reply.send({ success: true, data });
    }
    async getLeaderboard(request, reply) {
        const data = await analyticsService.getLeaderboard();
        return reply.send({ success: true, data });
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map