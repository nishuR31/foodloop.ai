"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionController = void 0;
const production_service_1 = require("../services/production.service");
const production_schema_1 = require("../schemas/production.schema");
const prodService = new production_service_1.ProductionService();
class ProductionController {
    async recordProduction(request, reply) {
        const body = production_schema_1.prodSchema.parse(request.body);
        const data = await prodService.recordProduction(request.user, body);
        return reply.send({ success: true, data });
    }
    async consumeAndSurplus(request, reply) {
        const body = production_schema_1.consSchema.parse(request.body);
        const data = await prodService.consumeAndCalculateSurplus(request.user, body);
        return reply.send({ success: true, data });
    }
}
exports.ProductionController = ProductionController;
//# sourceMappingURL=production.controller.js.map