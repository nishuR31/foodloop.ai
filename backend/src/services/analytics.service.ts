import { PrismaClient } from '@prisma/client';
import { AnalyticsRepository } from '../repositories/analytics.repository';

const prisma = new PrismaClient();
const analyticsRepo = new AnalyticsRepository();

export class AnalyticsService {
  async getImpact() {
    return analyticsRepo.getLatestImpact();
  }

  async getKitchenDashboard(user: any) {
    if (!user.organizationId) throw new Error('Kitchen not found');
    const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } });
    if (!kitchen) throw new Error('Kitchen not found');

    const data = await analyticsRepo.getKitchenDashboard(kitchen.id);

    // If no prediction for today, generate one using AI
    if (data.predictions.length === 0) {
      // Get historical data for the last 7 days to send to AI
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const history = await prisma.productionRecord.findMany({
        where: { kitchenId: kitchen.id, date: { gte: lastWeek } },
        orderBy: { date: 'asc' }
      });

      const historyPayload = history.map(h => ({
        date: h.date.toISOString(),
        demand: h.quantityProduced // Simplified: assume production reflects demand for this mock
      }));

      try {
        const { AiService } = require('./ai.service');
        const aiService = new AiService();
        const aiRes = await aiService.demandPrediction({ history: historyPayload });

        if (aiRes && aiRes.predictedDemand) {
          const newPrediction = await prisma.demandPrediction.create({
            data: {
              kitchenId: kitchen.id,
              targetDate: new Date(),
              predictedDemand: aiRes.predictedDemand,
              recommendedProduction: aiRes.recommendedProduction,
              expectedSurplus: Math.max(0, aiRes.recommendedProduction - aiRes.predictedDemand),
              confidence: aiRes.confidence || 0.8
            }

          });
          data.predictions.push(newPrediction);
        }
      } catch (e) {
        console.error("Failed to auto-generate AI demand prediction:", e);
      }
    }

    return data;
  }

  async getSystemOverview(user: any) {
    if (user.role !== 'ADMIN') throw new Error('Unauthorized');
    return analyticsRepo.getSystemOverview();
  }

  async getActivityTimeline(user: any) {
    if (user.role !== 'ADMIN') throw new Error('Unauthorized');
    return analyticsRepo.getActivityTimeline();
  }

  async getOrganizations(user: any) {
    if (user.role !== 'ADMIN') throw new Error('Unauthorized');
    return analyticsRepo.getOrganizations();
  }

  async getLeaderboard() {
    return analyticsRepo.getLeaderboard();
  }
}
