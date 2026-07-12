import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<{
        profile: {
            id: string;
            updatedAt: Date;
            userId: string;
            firstName: string | null;
            lastName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
        preferences: {
            id: string;
            updatedAt: Date;
            userId: string;
            baseCurrency: string;
            emailNotify: boolean;
            pushNotify: boolean;
            theme: string;
        } | null;
        wallets: {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import(".prisma/client").$Enums.Currency;
            balance: import("@prisma/client/runtime/library").Decimal;
            reservedBalance: import("@prisma/client/runtime/library").Decimal;
            address: string | null;
            version: number;
        }[];
        id: string;
        email: string | null;
        phone: string | null;
        resetToken: string | null;
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetTokenExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        firstName: string | null;
        lastName: string | null;
        kycStatus: string;
        avatarUrl: string | null;
    }>;
    updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        baseCurrency: string;
        emailNotify: boolean;
        pushNotify: boolean;
        theme: string;
    }>;
    getDevices(userId: string): Promise<{
        id: string;
        userId: string;
        deviceId: string;
        fingerprint: string;
        lastLogin: Date;
        userAgent: string | null;
        ipAddress: string | null;
        fcmToken: string | null;
    }[]>;
    removeDevice(userId: string, deviceId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
