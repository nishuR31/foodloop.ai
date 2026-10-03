"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const ai_service_1 = require("../services/ai.service");
const ai_schema_1 = require("../schemas/ai.schema");
const aiService = new ai_service_1.AiService();
class AiController {
    async ocrExtract(request, reply) {
        if (!request.isMultipart()) {
            return reply.status(400).send({ success: false, message: 'Request must be multipart/form-data' });
        }
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ success: false, message: 'No file uploaded' });
        }
        const fileBuffer = await data.toBuffer();
        try {
            const result = await aiService.ocrExtract(fileBuffer, data.filename, data.mimetype);
            return reply.send({ success: true, data: result });
        }
        catch (err) {
            return reply.status(500).send({ success: false, message: err.message });
        }
    }
    async demandPrediction(request, reply) {
        const body = ai_schema_1.demandPredictionSchema.parse(request.body);
        const data = await aiService.demandPrediction(body);
        return reply.send({ success: true, data });
    }
    async analyzeQuality(request, reply) {
        const body = ai_schema_1.analyzeQualitySchema.parse(request.body);
        const data = await aiService.analyzeQuality(body);
        return reply.send({ success: true, data });
    }
    async getRecommendations(request, reply) {
        const user = request.user;
        let kitchenId;
        if (user && user.organizationId) {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } });
            if (kitchen)
                kitchenId = kitchen.id;
        }
        const data = await aiService.getRecommendations(kitchenId);
        return reply.send({ success: true, data });
    }
    async getScans(request, reply) {
        const data = await aiService.getScans();
        return reply.send({ success: true, data });
    }
}
exports.AiController = AiController;
//# sourceMappingURL=ai.controller.js.map