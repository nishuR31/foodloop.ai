import { FastifyInstance } from 'fastify';
import { AuditController } from '../controllers/audit.controller';

const auditController = new AuditController();

export default async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/', auditController.getAuditLogs.bind(auditController));
}
