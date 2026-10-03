"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationRepository = exports.TokenRepository = exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserRepository {
    async findByEmail(email) {
        return prisma.user.findUnique({ where: { email }, include: { organization: true } });
    }
    async findById(id) {
        return prisma.user.findUnique({ where: { id }, include: { organization: true } });
    }
    async create(data) {
        return prisma.user.create({ data });
    }
    async update(id, data) {
        return prisma.user.update({ where: { id }, data });
    }
    async findByResetToken(token) {
        return prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });
    }
}
exports.UserRepository = UserRepository;
class TokenRepository {
    async createRefreshToken(userId, token, expiresAt) {
        return prisma.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt
            }
        });
    }
    async findRefreshToken(token) {
        return prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true }
        });
    }
    async revokeRefreshToken(token) {
        return prisma.refreshToken.updateMany({
            where: { token },
            data: { revoked: true }
        });
    }
}
exports.TokenRepository = TokenRepository;
class OrganizationRepository {
    async createOrganizationWithRole(name, role, userId) {
        let orgType = role;
        // Create Organization if role requires it
        if (['KITCHEN', 'NGO', 'ADMIN'].includes(role)) {
            const org = await prisma.organization.create({
                data: { name, type: orgType }
            });
            if (role === 'KITCHEN') {
                await prisma.kitchen.create({
                    data: { name, location: 'To be updated', organizationId: org.id }
                });
            }
            else if (role === 'NGO') {
                await prisma.nGO.create({
                    data: { name, location: 'To be updated', organizationId: org.id }
                });
            }
            return org.id;
        }
        return null;
    }
    async createDriverProfile(userId) {
        await prisma.driver.create({
            data: { userId, isAvailable: true }
        });
    }
}
exports.OrganizationRepository = OrganizationRepository;
//# sourceMappingURL=user.repository.js.map