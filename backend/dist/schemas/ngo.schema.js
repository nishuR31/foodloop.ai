"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptSurplusSchema = void 0;
const zod_1 = require("zod");
exports.acceptSurplusSchema = zod_1.z.object({
    surplusId: zod_1.z.string(),
    quantityRequested: zod_1.z.number()
});
//# sourceMappingURL=ngo.schema.js.map