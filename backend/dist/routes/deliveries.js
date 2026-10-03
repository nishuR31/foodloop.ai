"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deliveryRoutes;
const delivery_controller_1 = require("../controllers/delivery.controller");
const deliveryController = new delivery_controller_1.DeliveryController();
async function deliveryRoutes(fastify) {
    fastify.addHook('preValidation', async (request, reply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            reply.send(err);
        }
    });
    fastify.get('/', deliveryController.getDeliveries.bind(deliveryController));
    fastify.get('/available', deliveryController.getAvailableDeliveries.bind(deliveryController));
    fastify.post('/:id/claim', deliveryController.claimDelivery.bind(deliveryController));
    fastify.post('/:id/status', deliveryController.updateDeliveryStatus.bind(deliveryController));
}
//# sourceMappingURL=deliveries.js.map