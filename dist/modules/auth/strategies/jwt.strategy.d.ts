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
        email: string | null;
        phone: string | null;
        resetToken: string | null;
        passwordHash: string;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetTokenExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
