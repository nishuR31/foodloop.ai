"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const user_repository_1 = require("../repositories/user.repository");
class AuthService {
    userRepo;
    tokenRepo;
    orgRepo;
    constructor() {
        this.userRepo = new user_repository_1.UserRepository();
        this.tokenRepo = new user_repository_1.TokenRepository();
        this.orgRepo = new user_repository_1.OrganizationRepository();
    }
    async registerUser(data) {
        const { name, email, password, role } = data;
        const existingUser = await this.userRepo.findByEmail(email);
        if (existingUser) {
            throw new Error('Email already exists');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        let userRole = role === 'KITCHEN' ? 'KITCHEN_MANAGER' :
            role === 'NGO' ? 'NGO_STAFF' :
                role === 'LOGISTICS' ? 'DRIVER' : 'ADMIN';
        const organizationId = await this.orgRepo.createOrganizationWithRole(name, role);
        const user = await this.userRepo.create({
            email,
            name,
            passwordHash,
            role: userRole,
            organizationId
        });
        if (role === 'LOGISTICS') {
            await this.orgRepo.createDriverProfile(user.id);
        }
        return user;
    }
    async validateUser(email, password) {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }
        return user;
    }
    async createRefreshToken(userId) {
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await this.tokenRepo.createRefreshToken(userId, refreshToken, expiresAt);
        return refreshToken;
    }
    async refreshTokens(refreshToken) {
        const storedToken = await this.tokenRepo.findRefreshToken(refreshToken);
        if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
            throw new Error('Invalid or expired refresh token');
        }
        return storedToken.user;
    }
    async logout(refreshToken) {
        await this.tokenRepo.revokeRefreshToken(refreshToken);
    }
    async forgotPassword(email) {
        const user = await this.userRepo.findByEmail(email);
        if (!user)
            return; // Silent fail
        const resetToken = crypto.randomBytes(32).toString('hex');
        await this.userRepo.update(user.id, {
            resetToken,
            resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });
        console.log(`Reset Token for ${email}: ${resetToken}`);
    }
    async resetPassword(token, newPassword) {
        const user = await this.userRepo.findByResetToken(token);
        if (!user)
            throw new Error('Invalid or expired token');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.update(user.id, {
            passwordHash,
            resetToken: null,
            resetTokenExpiry: null
        });
    }
    async getUserById(id) {
        return this.userRepo.findById(id);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map