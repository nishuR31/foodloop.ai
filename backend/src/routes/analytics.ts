import { FastifyInstance } from 'fastify';
import { AnalyticsController } from '../controllers/analytics.controller';

const analyticsController = new AnalyticsController();

export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', async (request, reply) => {
    try { await request.jwtVerify({ onlyCookie: true }) } catch (err) { reply.send(err) }
  });

  fastify.get('/impact', analyticsController.getImpact.bind(analyticsController));
  fastify.get('/kitchen-dashboard', analyticsController.getKitchenDashboard.bind(analyticsController));
  fastify.get('/system-overview', analyticsController.getSystemOverview.bind(analyticsController));
  fastify.get('/activity-timeline', analyticsController.getActivityTimeline.bind(analyticsController));
  fastify.get('/organizations', analyticsController.getOrganizations.bind(analyticsController));
  fastify.get('/leaderboard', analyticsController.getLeaderboard.bind(analyticsController));
}
