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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const prisma_service_1 = require("../../core/database/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const client_1 = require("../../generated/client/index.js");
const otplib_1 = require("otplib");
const toDataURL = __importStar(require("qrcode"));
const google_auth_library_1 = require("google-auth-library");
let AuthService = class AuthService {
    usersService;
    jwtService;
    configService;
    prisma;
    eventEmitter;
    constructor(usersService, jwtService, configService, prisma, eventEmitter) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async register(dto) {
        if (dto.email) {
            const existingEmail = await this.usersService.findOneByEmail(dto.email);
            if (existingEmail)
                throw new common_1.ConflictException('Email already exists');
        }
        if (dto.phone) {
            const existingPhone = await this.usersService.findOneByPhone(dto.phone);
            if (existingPhone)
                throw new common_1.ConflictException('Phone number already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                phone: dto.phone,
                passwordHash: hashedPassword,
                role: client_1.Role.USER,
                profile: {
                    create: {
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                    },
                },
            },
            include: { profile: true },
        });
        this.eventEmitter.emit('user.created', { userId: user.id, email: user.email });
        return this.generateTokens(user.id, user.role);
    }
    async login(dto) {
        const user = dto.email
            ? await this.usersService.findOneByEmail(dto.email)
            : await this.usersService.findOneByPhone(dto.phone);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        await this.prisma.device.upsert({
            where: { userId_deviceId: { userId: user.id, deviceId: dto.deviceId } },
            update: { lastLogin: new Date(), fingerprint: dto.fingerprint },
            create: {
                userId: user.id,
                deviceId: dto.deviceId,
                fingerprint: dto.fingerprint,
            },
        });
        const { passwordHash, ...userWithoutPassword } = user;
        const token = await this.generateTokens(user.id, user.role);
        const userData = { ...token, user: userWithoutPassword };
        return userData;
    }
    async generateTokens(userId, role) {
        const payload = { sub: userId, role };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '1h',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });
        await this.prisma.authToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken };
    }
    async refresh(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const tokenInDb = await this.prisma.authToken.findUnique({
                where: { token: refreshToken },
            });
            if (!tokenInDb || tokenInDb.expiresAt < new Date()) {
                throw new common_1.UnauthorizedException('Invalid or expired refresh token');
            }
            await this.prisma.authToken.delete({ where: { id: tokenInDb.id } });
            return this.generateTokens(payload.sub, payload.role);
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(refreshToken) {
        await this.prisma.authToken.deleteMany({ where: { token: refreshToken } });
    }
    async generate2FASecret(userId) {
        const user = await this.usersService.findOneById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        const secret = (0, otplib_1.generateSecret)();
        const otpauthUrl = (0, otplib_1.generateURI)({
            label: user.email || userId,
            issuer: 'P2N Marketplace',
            secret,
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret },
        });
        const qrCodeDataURL = await toDataURL.toDataURL(otpauthUrl);
        return { secret, qrCodeDataURL };
    }
    async verifyAndEnable2FA(userId, token) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret)
            throw new common_1.UnauthorizedException('2FA not initialized');
        const isValid = (0, otplib_1.verify)({ secret: user.twoFactorSecret, token });
        if (!isValid)
            throw new common_1.UnauthorizedException('Invalid 2FA token');
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
        return { success: true };
    }
    async googleLogin(dto) {
        const client = new google_auth_library_1.OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
        try {
            const ticket = await client.verifyIdToken({
                idToken: dto.token,
                audience: this.configService.get('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email)
                throw new common_1.UnauthorizedException('Invalid Google token');
            let user = await this.usersService.findOneByEmail(payload.email);
            if (!user) {
                user = await this.prisma.user.create({
                    data: {
                        email: payload.email,
                        passwordHash: '',
                        role: client_1.Role.USER,
                        profile: {
                            create: {
                                firstName: payload.given_name || '',
                                lastName: payload.family_name || '',
                            },
                        },
                    },
                    include: {
                        profile: true
                    }
                });
            }
            if (!user || !user.id) {
                throw new Error('User not found or ID is missing');
            }
            await this.prisma.device.upsert({
                where: {
                    userId_deviceId: {
                        userId: user.id,
                        deviceId: dto.deviceId
                    }
                },
                update: {
                    lastLogin: new Date(),
                    fingerprint: dto.fingerprint
                },
                create: {
                    userId: user.id,
                    deviceId: dto.deviceId,
                    fingerprint: dto.fingerprint,
                },
            });
            const { passwordHash, ...userWithoutPassword } = user;
            const token = await this.generateTokens(user.id, user.role);
            const userData = { ...token, user: userWithoutPassword };
            return userData;
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Google authentication failed');
        }
    }
    async forgotPassword(email) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user)
            return;
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpires: new Date(Date.now() + 3600000),
            },
        });
        return { resetToken };
    }
    async resetPassword(token, newPassword) {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpires: { gt: new Date() },
            },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetToken: null,
                resetTokenExpires: null,
            },
        });
        return { success: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], AuthService);
//# sourceMappingURL=auth.service.js.map