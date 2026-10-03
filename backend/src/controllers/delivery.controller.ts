import { FastifyRequest, FastifyReply } from 'fastify';
import { DeliveryService } from '../services/delivery.service';
import { deliveryStatusSchema } from '../schemas/delivery.schema';
import { z } from 'zod';

const deliveryService = new DeliveryService();

export class DeliveryController {
  async getDeliveries(request: FastifyRequest, reply: FastifyReply) {
    const deliveries = await deliveryService.getDeliveries(request.user);
    return reply.send({ success: true, data: deliveries });
  }

  async getAvailableDeliveries(request: FastifyRequest, reply: FastifyReply) {
    const deliveries = await deliveryService.getAvailableDeliveries();
    return reply.send({ success: true, data: deliveries });
  }

  async claimDelivery(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    const delivery = await deliveryService.claimDelivery(id, request.user);
    return reply.send({ success: true, data: delivery });
  }

  async updateDeliveryStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as any;
    const body = deliveryStatusSchema.parse(request.body);
    const delivery = await deliveryService.updateDeliveryStatus(id, body);
    return reply.send({ success: true, data: delivery });
  }
}
