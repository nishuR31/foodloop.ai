import { PrismaClient } from '@prisma/client';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryInput } from '../schemas/inventory.schema';
import { getIO } from '../socket';
import { AuditService } from './audit.service';

const prisma = new PrismaClient();
const inventoryRepo = new InventoryRepository();
const auditService = new AuditService();

export class InventoryService {
  async getInventory(user: any) {
    let kitchenId;
    if (user.role === 'KITCHEN_MANAGER') {
      if (!user.organizationId) throw new Error('Kitchen not found for org');
      const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId }});
      if (!kitchen) throw new Error('Kitchen not found for org');
      kitchenId = kitchen.id;
    }

    return inventoryRepo.findManyByKitchenId(kitchenId);
  }

  async createInventoryItem(user: any, input: InventoryInput) {
    if (user.role !== 'KITCHEN_MANAGER' && user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    if (!user.organizationId) throw new Error('Kitchen not found for org');
    const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId }});
    if (!kitchen) throw new Error('Kitchen not found for org');

    const newItem = await inventoryRepo.create({
      kitchenId: kitchen.id,
      productName: input.productName,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      batchNumber: input.batchNumber ?? null,
      barcode: input.barcode ?? null,
      manufacturingDate: input.manufacturingDate ? new Date(input.manufacturingDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      storageLocation: input.storageLocation ?? null,
      status: 'SAFE'
    });

    await auditService.logAction({
      entityId: newItem.id,
      entityType: 'INVENTORY',
      action: 'CREATE',
      actorId: user.id || user.email,
      details: { productName: input.productName, quantity: input.quantity }
    });

    const io = getIO();
    if (io) {
      io.emit('inventory_updated', newItem);
      io.to(`org_${user.organizationId}`).emit('notification', {
        title: 'New Inventory Item',
        message: `${input.productName} was added to inventory`
      });
    }

    return newItem;
  }
}
