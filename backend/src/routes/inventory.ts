import { FastifyInstance } from 'fastify';
import { InventoryController } from '../controllers/inventory.controller';

const inventoryController = new InventoryController();

export default async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [fastify.authenticate] }, inventoryController.getInventory.bind(inventoryController));
  fastify.post('/', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, inventoryController.createInventoryItem.bind(inventoryController));
}
