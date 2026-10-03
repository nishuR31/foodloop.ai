import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductionService } from '../services/production.service';
import { prodSchema, consSchema } from '../schemas/production.schema';
import { z } from 'zod';

const prodService = new ProductionService();

export class ProductionController {
  async recordProduction(request: FastifyRequest, reply: FastifyReply) {
    const body = prodSchema.parse(request.body);
    const data = await prodService.recordProduction(request.user, body);
    return reply.send({ success: true, data });
  }

  async consumeAndSurplus(request: FastifyRequest, reply: FastifyReply) {
    const body = consSchema.parse(request.body);
    const data = await prodService.consumeAndCalculateSurplus(request.user, body);
    return reply.send({ success: true, data });
  }
}
