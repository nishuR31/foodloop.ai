"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// Strong password: min 8 chars, uppercase, lowercase, digit, special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const strongPasswordMessage = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
});
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
    role: zod_1.z.enum(['KITCHEN', 'NGO', 'LOGISTICS', 'ADMIN']),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8, strongPasswordMessage).regex(strongPasswordRegex, strongPasswordMessage),
});
//# sourceMappingURL=auth.schema.js.map