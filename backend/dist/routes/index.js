"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = routes;
const auth_1 = __importDefault(require("./auth"));
const inventory_1 = __importDefault(require("./inventory"));
const analytics_1 = __importDefault(require("./analytics"));
const ngos_1 = __importDefault(require("./ngos"));
const deliveries_1 = __importDefault(require("./deliveries"));
const ai_1 = __importDefault(require("./ai"));
const production_1 = __importDefault(require("./production"));
const notifications_1 = __importDefault(require("./notifications"));
const sensors_1 = __importDefault(require("./sensors"));
const audit_1 = __importDefault(require("./audit"));
async function routes(fastify) {
    fastify.register(auth_1.default, { prefix: '/auth' });
    fastify.register(inventory_1.default, { prefix: '/inventory' });
    fastify.register(analytics_1.default, { prefix: '/analytics' });
    fastify.register(ngos_1.default, { prefix: '/ngos' });
    fastify.register(deliveries_1.default, { prefix: '/deliveries' });
    fastify.register(ai_1.default, { prefix: '/ai' });
    fastify.register(production_1.default, { prefix: '/production' });
    fastify.register(notifications_1.default, { prefix: '/notifications' });
    fastify.register(sensors_1.default, { prefix: '/sensors' });
    fastify.register(audit_1.default, { prefix: '/audit-logs' });
}
//# sourceMappingURL=index.js.map