import { FastifyRequest, FastifyReply } from 'fastify';
import { NgoService } from '../services/ngo.service';
import { acceptSurplusSchema } from '../schemas/ngo.schema';
import { z } from 'zod';

const ngoService = new NgoService();

export class NgoController {
  async getAvailableSurplus(request: FastifyRequest, reply: FastifyReply) {
    const surpluses = await ngoService.getAvailableSurplus(request.user);
    return reply.send({ success: true, data: surpluses });
  }

  async getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await ngoService.getDashboardStats(request.user);
    return reply.send({ success: true, data: stats });
  }

  async acceptSurplus(request: FastifyRequest, reply: FastifyReply) {
    const body = acceptSurplusSchema.parse(request.body);
    const result = await ngoService.acceptSurplus(request.user, body);
    return reply.send({ success: true, data: result });
  }
}
