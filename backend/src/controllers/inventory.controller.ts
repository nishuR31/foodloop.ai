import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { InventoryService } from '../services/inventory.service';
import { inventorySchema } from '../schemas/inventory.schema';

const inventoryService = new InventoryService();

export class InventoryController {
  async getInventory(request: FastifyRequest, reply: FastifyReply) {
    const items = await inventoryService.getInventory(request.user);
    return reply.send({ success: true, data: items });
  }

  async createInventoryItem(request: FastifyRequest, reply: FastifyReply) {
    const body = inventorySchema.parse(request.body);
    const item = await inventoryService.createInventoryItem(request.user, body);
    return reply.send({ success: true, data: item });
  }
}
