"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
const inventory_schema_1 = require("../schemas/inventory.schema");
const inventoryService = new inventory_service_1.InventoryService();
class InventoryController {
    async getInventory(request, reply) {
        const items = await inventoryService.getInventory(request.user);
        return reply.send({ success: true, data: items });
    }
    async createInventoryItem(request, reply) {
        const body = inventory_schema_1.inventorySchema.parse(request.body);
        const item = await inventoryService.createInventoryItem(request.user, body);
        return reply.send({ success: true, data: item });
    }
}
exports.InventoryController = InventoryController;
//# sourceMappingURL=inventory.controller.js.map