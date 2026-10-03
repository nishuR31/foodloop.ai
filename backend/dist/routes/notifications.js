"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = notificationsRoutes;
const notifications_controller_1 = require("../controllers/notifications.controller");
const notificationsController = new notifications_controller_1.NotificationsController();
async function notificationsRoutes(fastify) {
    fastify.addHook('preValidation', async (request, reply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            reply.send(err);
        }
    });
    fastify.get('/', notificationsController.getNotifications.bind(notificationsController));
    fastify.patch('/:id/read', notificationsController.markAsRead.bind(notificationsController));
}
//# sourceMappingURL=notifications.js.map