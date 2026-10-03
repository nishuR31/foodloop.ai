"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = aiRoutes;
const ai_controller_1 = require("../controllers/ai.controller");
const aiController = new ai_controller_1.AiController();
async function aiRoutes(fastify) {
    fastify.addHook('preValidation', async (request, reply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        }
        catch (err) {
            return reply.send(err);
        }
    });
    fastify.post('/ocr-extract', aiController.ocrExtract.bind(aiController));
    fastify.post('/demand-prediction', aiController.demandPrediction.bind(aiController));
    fastify.post('/analyze-quality', aiController.analyzeQuality.bind(aiController));
    fastify.get('/recommendations', aiController.getRecommendations.bind(aiController));
    fastify.get('/scans', aiController.getScans.bind(aiController));
}
//# sourceMappingURL=ai.js.map