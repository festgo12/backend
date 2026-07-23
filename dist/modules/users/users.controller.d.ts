import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<{
        profile: {
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            id: string;
            updatedAt: Date;
            userId: string;
            kycStatus: string;
        } | null;
        preferences: {
            baseCurrency: string;
            emailNotify: boolean;
            pushNotify: boolean;
            theme: string;
            id: string;
            updatedAt: Date;
            userId: string;
        } | null;
        wallets: {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            version: number;
        }[];
        id: string;
        email: string | null;
        phone: string | null;
        resetToken: string | null;
        role: import("@src/generated/client").$Enums.Role;
        status: import("@src/generated/client").$Enums.UserStatus;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetTokenExpires: Date | null;
        emailVerificationToken: string | null;
        emailVerificationExpires: Date | null;
        emailVerified: boolean;
        phoneVerificationToken: string | null;
        phoneVerificationExpires: Date | null;
        phoneVerified: boolean;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        id: string;
        updatedAt: Date;
        userId: string;
        kycStatus: string;
    }>;
    updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<{
        baseCurrency: string;
        emailNotify: boolean;
        pushNotify: boolean;
        theme: string;
        id: string;
        updatedAt: Date;
        userId: string;
    }>;
    getDevices(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        deviceId: string;
        fingerprint: string;
        deviceName: string | null;
        browser: string | null;
        osVersion: string | null;
        location: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        fcmToken: string | null;
        lastLogin: Date;
        lastActivity: Date | null;
    }[]>;
    removeDevice(userId: string, deviceId: string): Promise<import("@src/generated/client").Prisma.BatchPayload>;
}
