"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ngoRoutes;
const ngo_controller_1 = require("../controllers/ngo.controller");
const ngoController = new ngo_controller_1.NgoController();
async function ngoRoutes(fastify) {
    fastify.addHook('preValidation', async (request, reply) => {
        console.log('COOKIES RECEIVED:', request.cookies);
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            console.error('JWT VERIFY ERROR:', err);
            reply.send(err);
        }
    });
    fastify.get('/available-surplus', ngoController.getAvailableSurplus.bind(ngoController));
    fastify.get('/dashboard-stats', ngoController.getDashboardStats.bind(ngoController));
    fastify.post('/accept-surplus', ngoController.acceptSurplus.bind(ngoController));
}
//# sourceMappingURL=ngos.js.map