import { AdminService } from './admin.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { PlatformService } from '../crypto/platform.service';
import { UserStatus, Currency } from '@src/generated/client';
import { AdminUpdateAdDto, SweepFeeWalletDto, CreditTestFundsDto, UpdateFeeConfigDto } from './dto/admin-operations.dto';
export declare class AdminController {
    private readonly adminService;
    private readonly exchangeRateService;
    private readonly platformService;
    constructor(adminService: AdminService, exchangeRateService: ExchangeRateService, platformService: PlatformService);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalOrders: number;
        completedOrders: number;
        pendingDisputes: number;
        totalRevenue: number;
        completionRate: number;
    }>;
    getUsers(page?: string, limit?: string, search?: string): Promise<{
        users: ({
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateUserStatus(userId: string, status: UserStatus): Promise<{
        profile: {
            id: string;
            updatedAt: Date;
            userId: string;
            lastName: string | null;
            firstName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
        resetToken: string | null;
        passwordHash: string;
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
    }>;
    getUserDetail(userId: string): Promise<{
        profile: {
            id: string;
            updatedAt: Date;
            userId: string;
            lastName: string | null;
            firstName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
        wallets: {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
            isFrozen: boolean;
            version: number;
        }[];
        devices: {
            id: string;
            createdAt: Date;
            userId: string;
            ipAddress: string | null;
            deviceId: string;
            fingerprint: string;
            deviceName: string | null;
            browser: string | null;
            osVersion: string | null;
            location: string | null;
            userAgent: string | null;
            fcmToken: string | null;
            lastLogin: Date;
            lastActivity: Date | null;
        }[];
        securityLogs: {
            id: string;
            action: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            device: string | null;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
    }>;
    getAllWallets(page?: string, limit?: string, search?: string): Promise<{
        wallets: ({
            user: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
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
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
            isFrozen: boolean;
            version: number;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getWalletDetail(walletId: string): Promise<{
        user: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
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
        };
        ledgerEntries: ({
            transaction: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                type: import("@src/generated/client").$Enums.LedgerType;
                metadata: import("@src/generated/client/runtime/library").JsonValue | null;
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                fee: import("@src/generated/client/runtime/library").Decimal;
                walletId: string;
                reference: string;
                resolvedAt: Date | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
        snapshots: {
            id: string;
            createdAt: Date;
            balance: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
        version: number;
    }>;
    getAllTransactions(page?: string, limit?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    phone: string | null;
                    resetToken: string | null;
                    passwordHash: string;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAllOrders(page?: string, limit?: string, search?: string): Promise<{
        orders: ({
            ad: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                type: import("@src/generated/client").$Enums.AdType;
                status: string;
                asset: import("@src/generated/client").$Enums.Currency;
                sellerId: string;
                quantity: import("@src/generated/client/runtime/library").Decimal;
                price: import("@src/generated/client/runtime/library").Decimal;
                minLimit: import("@src/generated/client/runtime/library").Decimal;
                maxLimit: import("@src/generated/client/runtime/library").Decimal;
                isSponsored: boolean;
            };
            buyer: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
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
            };
            seller: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
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
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            status: import("@src/generated/client").$Enums.OrderStatus;
            adId: string;
            buyerId: string;
            sellerId: string;
            fiatAmount: import("@src/generated/client/runtime/library").Decimal;
            cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            expiresAt: Date;
            fraudFlagged: boolean;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOrderDetail(orderId: string): Promise<{
        ledgerEntries: ({
            wallet: {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
        ad: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            type: import("@src/generated/client").$Enums.AdType;
            status: string;
            asset: import("@src/generated/client").$Enums.Currency;
            sellerId: string;
            quantity: import("@src/generated/client/runtime/library").Decimal;
            price: import("@src/generated/client/runtime/library").Decimal;
            minLimit: import("@src/generated/client/runtime/library").Decimal;
            maxLimit: import("@src/generated/client/runtime/library").Decimal;
            isSponsored: boolean;
        };
        buyer: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
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
        };
        seller: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        status: import("@src/generated/client").$Enums.OrderStatus;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    flagOrder(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        status: import("@src/generated/client").$Enums.OrderStatus;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    releaseOrder(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        status: import("@src/generated/client").$Enums.OrderStatus;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    adminUpdateAd(adId: string, dto: AdminUpdateAdDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        type: import("@src/generated/client").$Enums.AdType;
        status: string;
        asset: import("@src/generated/client").$Enums.Currency;
        sellerId: string;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        price: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    adminDeleteAd(adId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        type: import("@src/generated/client").$Enums.AdType;
        status: string;
        asset: import("@src/generated/client").$Enums.Currency;
        sellerId: string;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        price: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    getBlockchainStats(): Promise<{
        balances: {
            currency: import("@src/generated/client").$Enums.Currency;
            total: number;
            walletCount: number;
            rate: number;
            valueInNgn: number;
        }[];
        totalBalanceNgn: number;
        txCount24h: number;
        pendingCount: number;
        failedCount: number;
        successRate: number;
        exchangeRates: Record<string, number>;
    }>;
    getBlockchainTransactions(page?: string, limit?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    phone: string | null;
                    resetToken: string | null;
                    passwordHash: string;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getFailedTransactions(page?: string, limit?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    phone: string | null;
                    resetToken: string | null;
                    passwordHash: string;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    retryFailedTransaction(transactionId: string): Promise<{
        txId: string;
        status: string;
    }>;
    getCryptoSystemStatus(): Promise<{
        provider: "alchemy";
        network: string;
        isTestnet: boolean;
        webhookProviders: {
            evm: string;
            btc: string;
            tron: string;
        };
        confirmations: {
            eth: number;
            btc: number;
            sol: number;
            tron: number;
        };
        depositSweepThreshold: number;
        registrySize: number;
        masterWallets: {
            evm: string;
            btc: string;
            sol: string;
            tron: string;
        };
        recentSweeps: {
            id: string;
            createdAt: Date;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
        }[];
    }>;
    getWithdrawalJobs(page?: string, limit?: string, status?: string): Promise<{
        jobs: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            currency: import("@src/generated/client").$Enums.Currency;
            chain: string | null;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            status: string;
            destination: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            txHash: string;
            walletId: string;
            attempts: number;
            nextPollAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getChainBalances(): Promise<{
        masterWallets: {
            evm: string;
            btc: string;
            sol: string;
            tron: string;
        };
        balances: ({
            chain: string;
            currency: "ETH" | "USDT" | "USDC" | "NGN";
            address: string;
            balance: number;
            error?: undefined;
        } | {
            chain: string;
            currency: "ETH" | "USDT" | "USDC" | "NGN";
            address: string;
            balance: number;
            error: string;
        } | {
            chain: string;
            currency: "BTC";
            address: string;
            balance: number;
            error?: undefined;
        } | {
            chain: string;
            currency: "BTC";
            address: string;
            balance: number;
            error: string;
        })[];
    }>;
    reconcileAll(): Promise<import("../crypto/reconciliation.service").ReconciliationResult>;
    reconcileCurrency(currency: Currency): Promise<import("../crypto/reconciliation.service").ReconciliationResult>;
    sweepAll(): Promise<{
        success: boolean;
        message: string;
        summary: import("../crypto/sweep.service").SweepRunSummary;
        swept: number;
    }>;
    getBtcHistory(page?: string, pageSize?: string): Promise<{
        transactions: {
            dbMatch: boolean;
            dbTransaction: {
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
            } | null;
            txid: string;
            amount: number;
            confirmations: number;
            blockHeight: number;
            direction: string;
            fromAddress: string;
            toAddress: string;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    getEvmHistory(address: string, page?: string): Promise<{
        address: string;
        transfers: {
            hash: string;
            amount: number;
            asset: string;
            category: string;
            from: string;
            to: string;
            blockNum: number;
            dbMatch: boolean;
            dbTransaction: {
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
            } | null;
        }[];
        page: number;
    }>;
    getFeeWallets(): Promise<{
        wallets: {
            id: string;
            currency: import("@src/generated/client").$Enums.Currency;
            chain: string | null;
            address: string | null;
            balance: number;
            reservedBalance: number;
            available: number;
            ledgerEntryCount: number;
            updatedAt: Date;
        }[];
        total: number;
    }>;
    initFeeWallets(): Promise<{
        success: boolean;
        userId: string;
        wallets: {
            currency: Currency;
            chain: string;
            id: string;
            address: string | null;
        }[];
    }>;
    sweepFeeWallet(currency: Currency, dto: SweepFeeWalletDto): Promise<{
        txId: string;
        status: string;
    }>;
    creditTestFunds(dto: CreditTestFundsDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        status: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        fee: import("@src/generated/client/runtime/library").Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    }>;
    getPaymentStats(): Promise<{
        totalDeposits: number | import("@src/generated/client/runtime/library").Decimal;
        totalWithdrawals: number | import("@src/generated/client/runtime/library").Decimal;
    }>;
    getPaymentTransactions(page?: string, limit?: string, search?: string, status?: string, type?: string, startDate?: string, endDate?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string | null;
                    phone: string | null;
                    resetToken: string | null;
                    passwordHash: string;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            resolvedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getPaymentTransactionDetail(transactionId: string): Promise<{
        wallet: {
            user: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
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
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
            isFrozen: boolean;
            version: number;
        };
        ledgerEntries: {
            id: string;
            createdAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            walletId: string;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        status: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        fee: import("@src/generated/client/runtime/library").Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
    }>;
    getExchangeRates(): {
        rates: Record<string, number>;
        usdRates: Record<string, number>;
        lastUpdated: Date;
        ageMinutes: number;
        source: string;
    };
    refreshExchangeRates(): Promise<{
        success: boolean;
        rates: Record<string, number>;
        lastUpdated: Date;
    }>;
    getAuditLogs(page?: string, limit?: string, action?: string, resource?: string, userId?: string, success?: string, startDate?: string, endDate?: string, search?: string): Promise<{
        logs: ({
            user: {
                id: string;
                email: string | null;
                profile: {
                    lastName: string | null;
                    firstName: string | null;
                } | null;
            };
        } & {
            id: string;
            action: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            device: string | null;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAuditStats(): Promise<{
        total: number;
        last24h: number;
        failures: number;
        last7d: Date;
        byResource: {
            resource: string;
            count: number;
        }[];
        byAction: {
            action: string;
            count: number;
        }[];
    }>;
    getUserAuditTrail(userId: string, page?: string, limit?: string): Promise<{
        logs: ({
            user: {
                id: string;
                email: string | null;
                profile: {
                    lastName: string | null;
                    firstName: string | null;
                } | null;
            };
        } & {
            id: string;
            action: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            device: string | null;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getFeeConfigs(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: import("@src/generated/client/runtime/library").Decimal;
        label: string;
    }[]>;
    updateFeeConfig(key: string, dto: UpdateFeeConfigDto): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: import("@src/generated/client/runtime/library").Decimal;
        label: string;
    }>;
}
