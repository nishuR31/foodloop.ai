"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consSchema = exports.prodSchema = void 0;
const zod_1 = require("zod");
exports.prodSchema = zod_1.z.object({
    foodItem: zod_1.z.string(),
    quantityProduced: zod_1.z.number(),
    unit: zod_1.z.string()
});
exports.consSchema = zod_1.z.object({
    foodItem: zod_1.z.string(),
    quantityConsumed: zod_1.z.number(),
    unit: zod_1.z.string()
});
//# sourceMappingURL=production.schema.js.map