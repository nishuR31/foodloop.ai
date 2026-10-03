"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class InventoryRepository {
    async findManyByKitchenId(kitchenId) {
        return prisma.inventoryItem.findMany({
            where: kitchenId ? { kitchenId } : {},
            orderBy: { expiryDate: 'asc' }
        });
    }
    async create(data) {
        return prisma.inventoryItem.create({
            data
        });
    }
}
exports.InventoryRepository = InventoryRepository;
//# sourceMappingURL=inventory.repository.js.map