"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgoController = void 0;
const ngo_service_1 = require("../services/ngo.service");
const ngo_schema_1 = require("../schemas/ngo.schema");
const ngoService = new ngo_service_1.NgoService();
class NgoController {
    async getAvailableSurplus(request, reply) {
        const surpluses = await ngoService.getAvailableSurplus(request.user);
        return reply.send({ success: true, data: surpluses });
    }
    async getDashboardStats(request, reply) {
        const stats = await ngoService.getDashboardStats(request.user);
        return reply.send({ success: true, data: stats });
    }
    async acceptSurplus(request, reply) {
        const body = ngo_schema_1.acceptSurplusSchema.parse(request.body);
        const result = await ngoService.acceptSurplus(request.user, body);
        return reply.send({ success: true, data: result });
    }
}
exports.NgoController = NgoController;
//# sourceMappingURL=ngo.controller.js.map