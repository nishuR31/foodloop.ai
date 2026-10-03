import { Prisma } from '@prisma/client';
export declare class UserRepository {
    findByEmail(email: string): Promise<({
        organization: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
        } | null;
    } & {
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    }) | null>;
    findById(id: string): Promise<({
        organization: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
        } | null;
    } & {
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    }) | null>;
    create(data: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    }>;
    update(id: string, data: Prisma.UserUpdateInput): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    }>;
    findByResetToken(token: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
    } | null>;
}
export declare class TokenRepository {
    createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<{
        id: string;
        createdAt: Date;
        token: string;
        expiresAt: Date;
        revoked: boolean;
        userId: string;
    }>;
    findRefreshToken(token: string): Promise<({
        user: {
            id: string;
            email: string;
            passwordHash: string;
            name: string;
            role: string;
            organizationId: string | null;
            createdAt: Date;
            updatedAt: Date;
            resetToken: string | null;
            resetTokenExpiry: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        token: string;
        expiresAt: Date;
        revoked: boolean;
        userId: string;
    }) | null>;
    revokeRefreshToken(token: string): Promise<Prisma.BatchPayload>;
}
export declare class OrganizationRepository {
    createOrganizationWithRole(name: string, role: string, userId?: string): Promise<string | null>;
    createDriverProfile(userId: string): Promise<void>;
}
//# sourceMappingURL=user.repository.d.ts.map