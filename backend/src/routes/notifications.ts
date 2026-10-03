import { FastifyInstance } from 'fastify';
import { NotificationsController } from '../controllers/notifications.controller';

const notificationsController = new NotificationsController();

export default async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', async (request, reply) => {
    try { await request.jwtVerify({ onlyCookie: true }) } catch (err) { reply.send(err) }
  });

  fastify.get('/', notificationsController.getNotifications.bind(notificationsController));
  fastify.patch('/:id/read', notificationsController.markAsRead.bind(notificationsController));
}
