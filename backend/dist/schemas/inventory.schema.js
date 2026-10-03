"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventorySchema = void 0;
const zod_1 = require("zod");
exports.inventorySchema = zod_1.z.object({
    productName: zod_1.z.string(),
    category: zod_1.z.string(),
    quantity: zod_1.z.number(),
    unit: zod_1.z.string(),
    batchNumber: zod_1.z.string().optional(),
    barcode: zod_1.z.string().optional(),
    manufacturingDate: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().optional(),
    storageLocation: zod_1.z.string().optional(),
});
//# sourceMappingURL=inventory.schema.js.map