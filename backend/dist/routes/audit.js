"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = auditRoutes;
const audit_controller_1 = require("../controllers/audit.controller");
const auditController = new audit_controller_1.AuditController();
async function auditRoutes(fastify) {
    fastify.get('/', auditController.getAuditLogs.bind(auditController));
}
//# sourceMappingURL=audit.js.map