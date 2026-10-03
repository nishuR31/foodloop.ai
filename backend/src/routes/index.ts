import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import inventoryRoutes from './inventory';
import analyticsRoutes from './analytics';
import ngoRoutes from './ngos';
import deliveryRoutes from './deliveries';
import aiRoutes from './ai';
import productionRoutes from './production';
import notificationsRoutes from './notifications';
import sensorsRoutes from './sensors';
import auditRoutes from './audit';

export default async function routes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(inventoryRoutes, { prefix: '/inventory' });
  fastify.register(analyticsRoutes, { prefix: '/analytics' });
  fastify.register(ngoRoutes, { prefix: '/ngos' });
  fastify.register(deliveryRoutes, { prefix: '/deliveries' });
  fastify.register(aiRoutes, { prefix: '/ai' });
  fastify.register(productionRoutes, { prefix: '/production' });
  fastify.register(notificationsRoutes, { prefix: '/notifications' });
  fastify.register(sensorsRoutes, { prefix: '/sensors' });
  fastify.register(auditRoutes, { prefix: '/audit-logs' });
}
