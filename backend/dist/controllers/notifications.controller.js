"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class NotificationsController {
    async getNotifications(request, reply) {
        const user = request.user;
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
    async markAsRead(request, reply) {
        const user = request.user;
        const { id } = request.params;
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
exports.NotificationsController = NotificationsController;
//# sourceMappingURL=notifications.controller.js.map