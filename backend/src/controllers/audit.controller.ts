import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService();

export class AuditController {
  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const data = await auditService.getAuditLogs();
    return reply.send({ success: true, data });
  }
}
