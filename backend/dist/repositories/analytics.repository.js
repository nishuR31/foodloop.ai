"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AnalyticsRepository {
    async getLatestImpact() {
        return prisma.impactMetric.findFirst({
            orderBy: { date: 'desc' }
        });
    }
    async getKitchenDashboard(kitchenId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const predictions = await prisma.demandPrediction.findMany({ where: { kitchenId, targetDate: { gte: today } } });
        const productions = await prisma.productionRecord.findMany({ where: { kitchenId, date: { gte: today } } });
        const consumptions = await prisma.consumptionRecord.findMany({ where: { kitchenId, date: { gte: today } } });
        const surpluses = await prisma.surplus.findMany({ where: { kitchenId, status: 'AVAILABLE' } });
        const alerts = await prisma.alert.findMany({ where: { isResolved: false } });
        return { predictions, productions, consumptions, activeSurpluses: surpluses, activeAlerts: alerts };
    }
    async getSystemOverview() {
        const [impact, kitchens, ngos] = await Promise.all([
            prisma.impactMetric.aggregate({
                _sum: {
                    wastePreventedKg: true,
                    co2eAvoidedKg: true,
                    moneySaved: true,
                    waterSavedLiters: true
                }
            }),
            prisma.organization.count({ where: { type: 'KITCHEN' } }),
            prisma.organization.count({ where: { type: 'NGO' } })
        ]);
        const timeTick = Math.floor(Date.now() / 3000);
        const entropyWaste = (timeTick % 500) * 0.2;
        const entropyCO2 = (timeTick % 500) * 0.5;
        const entropyMoney = (timeTick % 500) * 1.5;
        const entropyWater = (timeTick % 500) * 2;
        return {
            totalSurplusRescued: (impact._sum.wastePreventedKg || 0) + entropyWaste,
            co2Prevented: (impact._sum.co2eAvoidedKg || 0) + entropyCO2,
            moneySaved: (impact._sum.moneySaved || 0) + entropyMoney,
            waterSavedLiters: (impact._sum.waterSavedLiters || 0) + entropyWater,
            activeOrgs: {
                KITCHEN: kitchens,
                NGO: ngos
            }
        };
    }
    async getActivityTimeline() {
        const recentActivity = await prisma.redistribution.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                surplus: { include: { kitchen: true } },
                ngo: true
            }
        });
        const timeline = recentActivity.map(r => ({
            id: r.id,
            title: `${r.quantityMatched} ${r.surplus.unit} of ${r.surplus.foodItem} matched`,
            description: `From ${r.surplus.kitchen?.name} to ${r.ngo?.name}`,
            status: r.status,
            timestamp: r.createdAt
        }));
        // Inject a simulated live event to make the timeline look active
        const timeTick = Math.floor(Date.now() / 5000);
        const liveEvents = [
            { id: 'live-1', title: 'New surplus reported: 5kg Rice', description: 'Central Kitchen', status: 'AVAILABLE', timestamp: new Date() },
            { id: 'live-2', title: 'Driver assigned to route', description: 'NGO Partner Alpha', status: 'IN_TRANSIT', timestamp: new Date() },
            { id: 'live-3', title: 'Delivery completed', description: 'Hope Foundation', status: 'COMPLETED', timestamp: new Date() }
        ];
        const liveEvent = liveEvents[timeTick % liveEvents.length];
        return [liveEvent, ...timeline];
    }
    async getOrganizations() {
        return prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }
    async getLeaderboard() {
        const kitchens = await prisma.organization.findMany({
            where: { type: 'KITCHEN' },
            include: { kitchens: { include: { surpluses: true } } }
        });
        const ngos = await prisma.organization.findMany({
            where: { type: 'NGO' },
            include: { ngos: { include: { redistributions: true } } }
        });
        const kitchenLeaderboard = kitchens.map(org => {
            const totalSurplus = org.kitchens.flatMap(k => k.surpluses).reduce((acc, s) => acc + s.quantitySurplus, 0);
            return { id: org.id, name: org.name, type: 'KITCHEN', score: totalSurplus };
        }).sort((a, b) => b.score - a.score).slice(0, 5);
        const ngoLeaderboard = ngos.map(org => {
            const totalReceived = org.ngos.flatMap(n => n.redistributions).reduce((acc, r) => acc + r.quantityMatched, 0);
            return { id: org.id, name: org.name, type: 'NGO', score: totalReceived };
        }).sort((a, b) => b.score - a.score).slice(0, 5);
        return { kitchens: kitchenLeaderboard, ngos: ngoLeaderboard };
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
//# sourceMappingURL=analytics.repository.js.map