"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = inventoryRoutes;
const inventory_controller_1 = require("../controllers/inventory.controller");
const inventoryController = new inventory_controller_1.InventoryController();
async function inventoryRoutes(fastify) {
    fastify.get('/', { preValidation: [fastify.authenticate] }, inventoryController.getInventory.bind(inventoryController));
    fastify.post('/', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, inventoryController.createInventoryItem.bind(inventoryController));
}
//# sourceMappingURL=inventory.js.map