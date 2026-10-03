"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionService = void 0;
const client_1 = require("@prisma/client");
const production_repository_1 = require("../repositories/production.repository");
const socket_1 = require("../socket");
const audit_service_1 = require("./audit.service");
const prisma = new client_1.PrismaClient();
const prodRepo = new production_repository_1.ProductionRepository();
const auditService = new audit_service_1.AuditService();
class ProductionService {
    async recordProduction(user, input) {
        if (!user.organizationId)
            throw new Error('Kitchen not found');
        const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } });
        if (!kitchen)
            throw new Error('Kitchen not found');
        const record = await prodRepo.recordProduction(kitchen.id, input.foodItem, input.quantityProduced, input.unit);
        await auditService.logAction({
            entityId: record.id,
            entityType: 'PRODUCTION',
            action: 'RECORD',
            actorId: user.id || user.email,
            details: { foodItem: input.foodItem, quantityProduced: input.quantityProduced }
        });
        const io = (0, socket_1.getIO)();
        if (io) {
            io.emit('production_updated', record);
        }
        return record;
    }
    async consumeAndCalculateSurplus(user, input) {
        if (!user.organizationId)
            throw new Error('Kitchen not found');
        const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } });
        if (!kitchen)
            throw new Error('Kitchen not found');
        const result = await prodRepo.consumeAndCalculateSurplus(kitchen.id, input.foodItem, input.quantityConsumed, input.unit);
        if (result && result.surplus) {
            await auditService.logAction({
                entityId: result.surplus.id,
                entityType: 'SURPLUS',
                action: 'CALCULATE',
                actorId: user.id || user.email,
                details: { foodItem: input.foodItem, quantitySurplus: result.surplus.quantitySurplus }
            });
        }
        const io = (0, socket_1.getIO)();
        if (result && result.surplus && result.surplus.quantitySurplus > 0 && io) {
            const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
            io.emit('new-surplus', {
                message: `${result.surplus.quantitySurplus}${result.surplus.unit} of ${result.surplus.foodItem} is available from ${org?.name || 'a kitchen'}!`
            });
            io.to('role_ADMIN').emit('notification', {
                title: 'System Activity',
                message: `Surplus recorded at ${org?.name || 'a kitchen'}`
            });
            io.emit('surplus_updated');
        }
        else if (io) {
            io.emit('surplus_updated');
        }
        return result;
    }
}
exports.ProductionService = ProductionService;
//# sourceMappingURL=production.service.js.map