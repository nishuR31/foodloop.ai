import { PrismaClient } from '@prisma/client';
import { ProductionRepository } from '../repositories/production.repository';
import { ProdInput, ConsInput } from '../schemas/production.schema';
import { getIO } from '../socket';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();
const prodRepo = new ProductionRepository();
const auditService = new AuditService();

export class ProductionService {
  async recordProduction(user: any, input: ProdInput) {
    if (!user.organizationId) throw new Error('Kitchen not found');
    const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId }});
    if (!kitchen) throw new Error('Kitchen not found');

    const record = await prodRepo.recordProduction(kitchen.id, input.foodItem, input.quantityProduced, input.unit);
    
    await auditService.logAction({
      entityId: record.id,
      entityType: 'PRODUCTION',
      action: 'RECORD',
      actorId: user.id || user.email,
      details: { foodItem: input.foodItem, quantityProduced: input.quantityProduced }
    });

    const io = getIO();
    if (io) {
      io.emit('production_updated', record);
    }
    
    return record;
  }

  async consumeAndCalculateSurplus(user: any, input: ConsInput) {
    if (!user.organizationId) throw new Error('Kitchen not found');
    const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId }});
    if (!kitchen) throw new Error('Kitchen not found');

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

    const io = getIO();
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
    } else if (io) {
      io.emit('surplus_updated');
    }
    
    return result;
  }
}
