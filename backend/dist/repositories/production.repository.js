"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProductionRepository {
    async recordProduction(kitchenId, foodItem, quantityProduced, unit) {
        return prisma.productionRecord.create({
            data: {
                kitchenId,
                foodItem,
                quantityProduced,
                unit
            }
        });
    }
    async consumeAndCalculateSurplus(kitchenId, foodItem, quantityConsumed, unit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.$transaction(async (tx) => {
            // 1. Record consumption
            const cons = await tx.consumptionRecord.create({
                data: {
                    kitchenId,
                    foodItem,
                    quantityConsumed,
                    unit
                }
            });
            // 2. Find production
            const prods = await tx.productionRecord.findMany({
                where: { kitchenId, foodItem, date: { gte: today } }
            });
            const totalProduced = prods.reduce((sum, p) => sum + p.quantityProduced, 0);
            // 3. Calculate surplus
            const totalConsumed = await tx.consumptionRecord.aggregate({
                where: { kitchenId, foodItem, date: { gte: today } },
                _sum: { quantityConsumed: true }
            });
            const sumConsumed = (totalConsumed._sum.quantityConsumed || 0);
            const surplusQuantity = totalProduced - sumConsumed;
            let surplus = null;
            if (surplusQuantity > 0) {
                // Find existing surplus for today
                const existingSurplus = await tx.surplus.findFirst({
                    where: { kitchenId, foodItem, date: { gte: today }, status: 'AVAILABLE' }
                });
                if (existingSurplus) {
                    surplus = await tx.surplus.update({
                        where: { id: existingSurplus.id },
                        data: { quantitySurplus: surplusQuantity }
                    });
                }
                else {
                    surplus = await tx.surplus.create({
                        data: {
                            kitchenId,
                            foodItem,
                            quantitySurplus: surplusQuantity,
                            unit,
                            status: 'AVAILABLE'
                        }
                    });
                }
            }
            return { consumption: cons, surplus };
        });
    }
}
exports.ProductionRepository = ProductionRepository;
//# sourceMappingURL=production.repository.js.map