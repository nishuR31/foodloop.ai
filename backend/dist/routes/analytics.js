"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = analyticsRoutes;
const analytics_controller_1 = require("../controllers/analytics.controller");
const analyticsController = new analytics_controller_1.AnalyticsController();
async function analyticsRoutes(fastify) {
    fastify.addHook('preValidation', async (request, reply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            reply.send(err);
        }
    });
    fastify.get('/impact', analyticsController.getImpact.bind(analyticsController));
    fastify.get('/kitchen-dashboard', analyticsController.getKitchenDashboard.bind(analyticsController));
    fastify.get('/system-overview', analyticsController.getSystemOverview.bind(analyticsController));
    fastify.get('/activity-timeline', analyticsController.getActivityTimeline.bind(analyticsController));
    fastify.get('/organizations', analyticsController.getOrganizations.bind(analyticsController));
    fastify.get('/leaderboard', analyticsController.getLeaderboard.bind(analyticsController));
}
//# sourceMappingURL=analytics.js.map