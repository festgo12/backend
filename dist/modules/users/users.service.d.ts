import { PrismaService } from '../../core/database/prisma.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findMe(userId: string): Promise<{
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
        userId: string;
        deviceId: string;
        fingerprint: string;
        lastLogin: Date;
        userAgent: string | null;
        ipAddress: string | null;
        fcmToken: string | null;
    }[]>;
    removeDevice(userId: string, deviceId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findOneByEmail(email: string): Promise<({
        profile: {
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            id: string;
            updatedAt: Date;
            userId: string;
            kycStatus: string;
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
    }) | null>;
    findOneByPhone(phone: string): Promise<({
        profile: {
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            id: string;
            updatedAt: Date;
            userId: string;
            kycStatus: string;
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
    }) | null>;
    findOneById(id: string): Promise<({
        profile: {
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            id: string;
            updatedAt: Date;
            userId: string;
            kycStatus: string;
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
    }) | null>;
}
