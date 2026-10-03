import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getImpact(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getImpact();
    return reply.send({ success: true, data });
  }

  async getKitchenDashboard(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getKitchenDashboard(request.user);
    return reply.send({ success: true, data });
  }

  async getSystemOverview(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getSystemOverview(request.user);
    return reply.send({ success: true, data });
  }

  async getActivityTimeline(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getActivityTimeline(request.user);
    return reply.send({ success: true, data });
  }

  async getOrganizations(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getOrganizations(request.user);
    return reply.send({ success: true, data });
  }

  async getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
    const data = await analyticsService.getLeaderboard();
    return reply.send({ success: true, data });
  }
}
