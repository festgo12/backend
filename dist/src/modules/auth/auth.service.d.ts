import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../core/database/prisma.service';
import { SecurityService } from '../security/security.service';
import { FraudRulesService } from '../security/fraud-rules.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { Role } from '@src/generated/client';
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    private prisma;
    private eventEmitter;
    private securityService;
    private fraudRulesService;
    private emailService;
    private notifications;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, prisma: PrismaService, eventEmitter: EventEmitter2, securityService: SecurityService, fraudRulesService: FraudRulesService, emailService: EmailService, notifications: NotificationsService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, request?: any): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        requiresTwoFactor: boolean;
        twoFactorToken: string;
    }>;
    generateTokens(userId: string, role: Role, userAgent?: string, ipAddress?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(refreshToken: string, request?: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<void>;
    private notifyLogin;
    generateAndSend2faOtp(user: {
        id: string;
        email?: string | null;
    }): Promise<void>;
    verify2faOtp(userId: string, code: string): Promise<boolean>;
    clear2faOtp(userId: string): Promise<void>;
    enable2FA(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmEnable2FA(userId: string, code: string): Promise<{
        success: boolean;
    }>;
    verify2FALogin(twoFactorToken: string, code: string, request?: any): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    send2faOtp(twoFactorToken: string): Promise<{
        success: boolean;
        message: string;
    }>;
    disable2FA(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmDisable2FA(userId: string, code: string): Promise<{
        success: boolean;
    }>;
    googleLogin(dto: GoogleLoginDto): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    } | undefined>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    sendEmailVerification(userId: string): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
    verifyEmail(userId: string, token: string): Promise<{
        success: boolean;
    }>;
    sendPhoneVerification(userId: string): Promise<{
        message: string;
        code?: string | undefined;
        success: boolean;
    }>;
    verifyPhone(userId: string, token: string): Promise<{
        success: boolean;
    }>;
}
