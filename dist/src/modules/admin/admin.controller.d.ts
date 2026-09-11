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
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
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
    getUserDetail(userId: string): Promise<{
        profile: {
            id: string;
            updatedAt: Date;
            userId: string;
            firstName: string | null;
            lastName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
        wallets: {
            id: string;
            updatedAt: Date;
            chain: string | null;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            isFrozen: boolean;
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
            device: string | null;
            id: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            errorMessage: string | null;
        }[];
        id: string;
        status: import("@src/generated/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        phone: string | null;
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
    getAllWallets(page?: string, limit?: string, search?: string, currency?: string, chain?: string): Promise<{
        wallets: ({
            user: {
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
            };
        } & {
            id: string;
            updatedAt: Date;
            chain: string | null;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            isFrozen: boolean;
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
        };
        ledgerEntries: ({
            transaction: {
                type: import("@src/generated/client").$Enums.LedgerType;
                reference: string;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                amount: import("@src/generated/client/runtime/library").Decimal;
                metadata: import("@src/generated/client/runtime/library").JsonValue | null;
                walletId: string;
                fee: import("@src/generated/client/runtime/library").Decimal;
                resolvedAt: Date | null;
            } | null;
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            orderId: string | null;
            reference: string;
            id: string;
            createdAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
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
        chain: string | null;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
    }>;
    getAllTransactions(page?: string, limit?: string, currency?: string, chain?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
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
                };
            } & {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
            resolvedAt: Date | null;
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
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                sellerId: string;
                chain: string | null;
                version: number;
                asset: import("@src/generated/client").$Enums.Currency;
                price: import("@src/generated/client/runtime/library").Decimal;
                quantity: import("@src/generated/client/runtime/library").Decimal;
                minLimit: import("@src/generated/client/runtime/library").Decimal;
                maxLimit: import("@src/generated/client/runtime/library").Decimal;
                isSponsored: boolean;
            };
            buyer: {
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
            };
            seller: {
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
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            adId: string;
            buyerId: string;
            sellerId: string;
            chain: string | null;
            fiatAmount: import("@src/generated/client/runtime/library").Decimal;
            cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            expiresAt: Date;
            version: number;
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
        ad: {
            type: import("@src/generated/client").$Enums.AdType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            sellerId: string;
            chain: string | null;
            version: number;
            asset: import("@src/generated/client").$Enums.Currency;
            price: import("@src/generated/client/runtime/library").Decimal;
            quantity: import("@src/generated/client/runtime/library").Decimal;
            minLimit: import("@src/generated/client/runtime/library").Decimal;
            maxLimit: import("@src/generated/client/runtime/library").Decimal;
            isSponsored: boolean;
        };
        buyer: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
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
        };
        seller: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
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
        };
        ledgerEntries: ({
            wallet: {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            orderId: string | null;
            reference: string;
            id: string;
            createdAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
        })[];
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        version: number;
        fraudFlagged: boolean;
    }>;
    flagOrder(orderId: string): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        version: number;
        fraudFlagged: boolean;
    }>;
    releaseOrder(orderId: string): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        expiresAt: Date;
        version: number;
        fraudFlagged: boolean;
    }>;
    adminUpdateAd(adId: string, dto: AdminUpdateAdDto): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        chain: string | null;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
        minLimit: import("@src/generated/client/runtime/library").Decimal;
        maxLimit: import("@src/generated/client/runtime/library").Decimal;
        isSponsored: boolean;
    }>;
    adminDeleteAd(adId: string): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        chain: string | null;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: import("@src/generated/client/runtime/library").Decimal;
        quantity: import("@src/generated/client/runtime/library").Decimal;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
            reference: string;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
            id: string;
            status: string;
            createdAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
        }[];
    }>;
    getWithdrawalJobs(page?: string, limit?: string, status?: string): Promise<{
        jobs: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            chain: string | null;
            currency: import("@src/generated/client").$Enums.Currency;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            destination: string;
            txHash: string;
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
            currency: "NGN" | "USDT" | "ETH" | "USDC";
            address: string;
            balance: number;
            error?: undefined;
        } | {
            chain: string;
            currency: "NGN" | "USDT" | "ETH" | "USDC";
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
                reference: string;
                wallet: {
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
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
                reference: string;
                wallet: {
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
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
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@src/generated/client/runtime/library").Decimal;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        fee: import("@src/generated/client/runtime/library").Decimal;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                chain: string | null;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
            };
        } & {
            id: string;
            updatedAt: Date;
            chain: string | null;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
            derivationIndex: number | null;
            isFrozen: boolean;
        };
        ledgerEntries: {
            type: import("@src/generated/client").$Enums.LedgerType;
            orderId: string | null;
            reference: string;
            id: string;
            createdAt: Date;
            amount: import("@src/generated/client/runtime/library").Decimal;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
        }[];
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        reference: string;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@src/generated/client/runtime/library").Decimal;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        fee: import("@src/generated/client/runtime/library").Decimal;
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
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
                id: string;
                email: string | null;
            };
        } & {
            device: string | null;
            id: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
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
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
                id: string;
                email: string | null;
            };
        } & {
            device: string | null;
            id: string;
            createdAt: Date;
            userId: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
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
