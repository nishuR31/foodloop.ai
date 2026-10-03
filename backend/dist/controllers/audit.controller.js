"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_service_1 = require("../services/audit.service");
const auditService = new audit_service_1.AuditService();
class AuditController {
    async getAuditLogs(request, reply) {
        const data = await auditService.getAuditLogs();
        return reply.send({ success: true, data });
    }
}
exports.AuditController = AuditController;
//# sourceMappingURL=audit.controller.js.map