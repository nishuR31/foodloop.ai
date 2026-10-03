"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = productionRoutes;
const production_controller_1 = require("../controllers/production.controller");
const productionController = new production_controller_1.ProductionController();
async function productionRoutes(fastify) {
    fastify.post('/record', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, productionController.recordProduction.bind(productionController));
    fastify.post('/consume-and-surplus', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, productionController.consumeAndSurplus.bind(productionController));
}
//# sourceMappingURL=production.js.map