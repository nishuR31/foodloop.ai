"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const auth_controller_1 = require("../controllers/auth.controller");
async function authRoutes(fastify) {
    const authController = new auth_controller_1.AuthController();
    fastify.post('/register', authController.register.bind(authController));
    fastify.post('/login', authController.login.bind(authController));
    fastify.post('/refresh', authController.refresh.bind(authController));
    fastify.post('/logout', authController.logout.bind(authController));
    fastify.post('/forgot-password', authController.forgotPassword.bind(authController));
    fastify.post('/reset-password', authController.resetPassword.bind(authController));
    // --- STUBS FOR ADVANCED AUTH ---
    fastify.get('/oauth/google', async (request, reply) => {
        return reply.send({ success: true, message: 'OAuth redirect stub' });
    });
    fastify.get('/passkey/generate-registration-options', async (request, reply) => {
        return reply.send({ success: true, message: 'Passkey gen reg options stub' });
    });
    fastify.post('/passkey/verify-registration', async (request, reply) => {
        return reply.send({ success: true, message: 'Passkey verify reg stub' });
    });
    fastify.get('/me', {
        preValidation: [async (request, reply) => {
                const token = request.cookies.accessToken;
                if (!token)
                    return reply.status(401).send({ error: 'No token' });
                try {
                    const decoded = fastify.jwt.verify(token);
                    request.user = decoded;
                }
                catch (err) {
                    return reply.status(401).send({ error: 'Invalid token' });
                }
            }]
    }, authController.me.bind(authController));
}
//# sourceMappingURL=auth.js.map