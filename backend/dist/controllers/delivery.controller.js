"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryController = void 0;
const delivery_service_1 = require("../services/delivery.service");
const delivery_schema_1 = require("../schemas/delivery.schema");
const deliveryService = new delivery_service_1.DeliveryService();
class DeliveryController {
    async getDeliveries(request, reply) {
        const deliveries = await deliveryService.getDeliveries(request.user);
        return reply.send({ success: true, data: deliveries });
    }
    async getAvailableDeliveries(request, reply) {
        const deliveries = await deliveryService.getAvailableDeliveries();
        return reply.send({ success: true, data: deliveries });
    }
    async claimDelivery(request, reply) {
        const { id } = request.params;
        const delivery = await deliveryService.claimDelivery(id, request.user);
        return reply.send({ success: true, data: delivery });
    }
    async updateDeliveryStatus(request, reply) {
        const { id } = request.params;
        const body = delivery_schema_1.deliveryStatusSchema.parse(request.body);
        const delivery = await deliveryService.updateDeliveryStatus(id, body);
        return reply.send({ success: true, data: delivery });
    }
}
exports.DeliveryController = DeliveryController;
//# sourceMappingURL=delivery.controller.js.map