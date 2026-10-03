import { FastifyInstance } from 'fastify';
import { ProductionController } from '../controllers/production.controller';

const productionController = new ProductionController();

export default async function productionRoutes(fastify: FastifyInstance) {
  fastify.post('/record', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, productionController.recordProduction.bind(productionController));
  fastify.post('/consume-and-surplus', { preValidation: [fastify.requireRoles(['KITCHEN_MANAGER', 'ADMIN'])] }, productionController.consumeAndSurplus.bind(productionController));
}
