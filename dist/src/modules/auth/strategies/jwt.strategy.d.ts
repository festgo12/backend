import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: any): Promise<{
        profile: {
            id: string;
            updatedAt: Date;
            userId: string;
            firstName: string | null;
            lastName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        passwordHash: string;
        role: import("@src/generated/client").$Enums.Role;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        twoFactorOtpHash: string | null;
        twoFactorOtpExpires: Date | null;
        resetToken: string | null;
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
    }>;
}
export {};
