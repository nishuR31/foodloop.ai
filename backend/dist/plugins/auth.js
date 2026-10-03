"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
        }
    });
    fastify.decorate('requireRoles', (roles) => {
        return async (request, reply) => {
            try {
                await request.jwtVerify({ onlyCookie: true });
                const user = request.user;
                if (!roles.includes(user.role)) {
                    reply.status(403).send({ success: false, error: { message: 'Forbidden: Insufficient role' } });
                    return;
                }
            }
            catch (err) {
                reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
            }
        };
    });
});
//# sourceMappingURL=auth.js.map