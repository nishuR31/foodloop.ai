import { PrismaClient, User, Prisma, RefreshToken } from '@prisma/client';

const prisma = new PrismaClient();

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { organization: true } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { organization: true } });
  }

  async create(data: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  async findByResetToken(token: string) {
    return prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });
  }
}

export class TokenRepository {
  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });
  }

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true }
    });
  }
}

export class OrganizationRepository {
  async createOrganizationWithRole(name: string, role: string, userId?: string) {
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
      } else if (role === 'NGO') {
        await prisma.nGO.create({
          data: { name, location: 'To be updated', organizationId: org.id }
        });
      }
      return org.id;
    }
    return null;
  }
  
  async createDriverProfile(userId: string) {
    await prisma.driver.create({
      data: { userId, isAvailable: true }
    });
  }
}
