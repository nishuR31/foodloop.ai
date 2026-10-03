import { FastifyRequest, FastifyReply } from 'fastify';
import { AiService } from '../services/ai.service';
import { ocrSchema, demandPredictionSchema, analyzeQualitySchema } from '../schemas/ai.schema';
import { z } from 'zod';

const aiService = new AiService();

export class AiController {
  async ocrExtract(request: FastifyRequest, reply: FastifyReply) {
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }

  async demandPrediction(request: FastifyRequest, reply: FastifyReply) {
    const body = demandPredictionSchema.parse(request.body);
    const data = await aiService.demandPrediction(body);
    return reply.send({ success: true, data });
  }

  async analyzeQuality(request: FastifyRequest, reply: FastifyReply) {
    const body = analyzeQualitySchema.parse(request.body);
    const data = await aiService.analyzeQuality(body);
    return reply.send({ success: true, data });
  }

  async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any;
    let kitchenId: string | undefined;
    if (user && user.organizationId) {
       const { PrismaClient } = require('@prisma/client');
       const prisma = new PrismaClient();
       const kitchen = await prisma.kitchen.findFirst({ where: { organizationId: user.organizationId } });
       if (kitchen) kitchenId = kitchen.id;
    }
    const data = await aiService.getRecommendations(kitchenId);
    return reply.send({ success: true, data });
  }

  async getScans(request: FastifyRequest, reply: FastifyReply) {
    const data = await aiService.getScans();
    return reply.send({ success: true, data });
  }
}
