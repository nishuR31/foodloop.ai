export declare class AuthService {
    private userRepo;
    private tokenRepo;
    private orgRepo;
    constructor();
    registerUser(data: any): Promise<{
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
    validateUser(email: string, password: string): Promise<{
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
    }>;
    createRefreshToken(userId: string): Promise<string>;
    refreshTokens(refreshToken: string): Promise<{
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
    logout(refreshToken: string): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    getUserById(id: string): Promise<({
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
}
//# sourceMappingURL=auth.service.d.ts.map