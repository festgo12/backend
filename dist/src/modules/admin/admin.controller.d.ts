import { AdminService } from './admin.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { PlatformService } from '../crypto/platform.service';
import { UserStatus, Currency } from '@src/generated/client';
import { AdminUpdateAdDto, SweepFeeWalletDto, SweepConfigDto, CreditTestFundsDto, UpdateFeeConfigDto } from './dto/admin-operations.dto';
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
            status: import("@src/generated/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            isSystem: boolean;
            phone: string | null;
            email: string | null;
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
        status: import("@src/generated/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        isSystem: boolean;
        phone: string | null;
        email: string | null;
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
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            userId: string;
            device: string | null;
            action: string;
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
        status: import("@src/generated/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        isSystem: boolean;
        phone: string | null;
        email: string | null;
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
    }>;
    getAllWallets(page?: string, limit?: string, search?: string, currency?: string, chain?: string): Promise<{
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
                status: import("@src/generated/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                isSystem: boolean;
                phone: string | null;
                email: string | null;
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
        ledgerEntries: ({
            transaction: {
                id: string;
                walletId: string;
                type: import("@src/generated/client").$Enums.LedgerType;
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                fee: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
                metadata: import("@src/generated/client/runtime/library").JsonValue | null;
                resolvedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
        } & {
            id: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
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
            status: import("@src/generated/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            isSystem: boolean;
            phone: string | null;
            email: string | null;
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
        };
        snapshots: {
            id: string;
            walletId: string;
            createdAt: Date;
            balance: import("@src/generated/client/runtime/library").Decimal;
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
    getAllTransactions(page?: string, limit?: string, currency?: string, chain?: string): Promise<{
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    isSystem: boolean;
                    phone: string | null;
                    email: string | null;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAllOrders(page?: string, limit?: string, search?: string, chain?: string): Promise<{
        orders: ({
            ad: {
                id: string;
                type: import("@src/generated/client").$Enums.AdType;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                chain: string | null;
                version: number;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                isSystem: boolean;
                phone: string | null;
                email: string | null;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                isSystem: boolean;
                phone: string | null;
                email: string | null;
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
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            chain: string | null;
            version: number;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
        ad: {
            id: string;
            type: import("@src/generated/client").$Enums.AdType;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            chain: string | null;
            version: number;
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
            status: import("@src/generated/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            isSystem: boolean;
            phone: string | null;
            email: string | null;
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
            status: import("@src/generated/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            isSystem: boolean;
            phone: string | null;
            email: string | null;
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
        };
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
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
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
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
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
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
        type: import("@src/generated/client").$Enums.AdType;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
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
        type: import("@src/generated/client").$Enums.AdType;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
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
    getBlockchainTransactions(page?: string, limit?: string, chain?: string): Promise<{
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    isSystem: boolean;
                    phone: string | null;
                    email: string | null;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    isSystem: boolean;
                    phone: string | null;
                    email: string | null;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        webhookSigningCoverage: Record<string, {
            configured: boolean;
            keySource: string;
        }>;
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
        sanctions: {
            lastRefreshedAt: string | null;
            counts: Record<string, number>;
        };
        recentSweeps: {
            id: string;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            createdAt: Date;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
        }[];
    }>;
    refreshSanctions(): Promise<import("../security/crypto-risk.service").RefreshResult>;
    getWithdrawalJobs(page?: string, limit?: string, status?: string): Promise<{
        jobs: {
            id: string;
            walletId: string;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
            currency: import("@src/generated/client").$Enums.Currency;
            chain: string | null;
            txHash: string;
            destination: string;
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
            evm: string | null;
            btc: string | null;
            sol: string | null;
            tron: string | null;
        };
        balances: ({
            chain: string;
            currency: import("@src/generated/client").$Enums.Currency;
            address: string | null;
            balance: number;
            error: string;
        } | {
            chain: "ETH" | "BSC" | "POLYGON";
            currency: import("@src/generated/client").$Enums.Currency;
            address: string;
            balance: number;
        } | {
            chain: string;
            currency: "USDT" | "USDC";
            address: string;
            balance: number;
        } | {
            chain: string;
            currency: "BTC";
            address: string;
            balance: number;
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
    sweepChain(chain: string): Promise<import("../crypto/sweep.service").SweepRunSummary>;
    getSweepConfig(): Promise<{
        globalThresholdUsd: number;
        chains: {
            chain: string;
            enabled: boolean;
            thresholdUsd: number | null;
            usesGlobalThreshold: boolean;
        }[];
    }>;
    updateSweepConfig(chain: string, dto: SweepConfigDto): Promise<{
        chain: string;
        enabled: boolean;
        thresholdUsd: number | null;
    }>;
    getBtcHistory(page?: string, pageSize?: string): Promise<{
        transactions: {
            dbMatch: boolean;
            dbTransaction: {
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
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
    getEvmHistory(address: string, chain?: string, page?: string): Promise<{
        address: string;
        chain: string;
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
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
            } | null;
        }[];
        page: number;
    }>;
    getTronHistory(address: string, page?: string): Promise<{
        address: string;
        chain: string;
        transfers: Record<string, unknown>[];
        page: number;
        total: number;
    }>;
    getSolHistory(address: string, page?: string): Promise<{
        address: string;
        chain: string;
        transfers: Record<string, unknown>[];
        page: number;
        total: number;
    }>;
    evmPull(chain: string, address: string): Promise<{
        chain: string;
        address: string;
        found: number;
        credited: number;
        alreadyRecorded: number;
        skipped: string[];
        errors: string[];
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
        walletId: string;
        type: import("@src/generated/client").$Enums.LedgerType;
        status: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        fee: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    isSystem: boolean;
                    phone: string | null;
                    email: string | null;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                isSystem: boolean;
                phone: string | null;
                email: string | null;
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
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            transactionId: string | null;
            orderId: string | null;
        }[];
    } & {
        id: string;
        walletId: string;
        type: import("@src/generated/client").$Enums.LedgerType;
        status: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        fee: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
                profile: {
                    lastName: string | null;
                    firstName: string | null;
                } | null;
                email: string | null;
            };
        } & {
            id: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            userId: string;
            device: string | null;
            action: string;
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
                profile: {
                    lastName: string | null;
                    firstName: string | null;
                } | null;
                email: string | null;
            };
        } & {
            id: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            userId: string;
            device: string | null;
            action: string;
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
