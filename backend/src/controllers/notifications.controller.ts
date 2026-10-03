import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationsController {
  async getNotifications(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: user.id },
          { userId: null } // System-wide broadcast
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    return reply.send({ success: true, data: notifications });
  }

  async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    
    await prisma.notification.updateMany({
      where: {
        id,
        userId: user.id
      },
      data: { read: true }
    });
    
    return reply.send({ success: true });
  }
}
