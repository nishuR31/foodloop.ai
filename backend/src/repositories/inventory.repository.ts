import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryRepository {
  async findManyByKitchenId(kitchenId?: string) {
    return prisma.inventoryItem.findMany({
      where: kitchenId ? { kitchenId } : {},
      orderBy: { expiryDate: 'asc' }
    });
  }

  async create(data: Prisma.InventoryItemUncheckedCreateInput) {
    return prisma.inventoryItem.create({
      data
    });
  }
}
