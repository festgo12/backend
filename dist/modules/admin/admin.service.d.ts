import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus } from '@src/generated/client';
import { Prisma } from '@src/generated/client';
import { TatumWithdrawalService } from '../tatum/tatum-withdrawal.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
export declare class AdminService {
    private prisma;
    private readonly tatumWithdrawal;
    private readonly exchangeRateService;
    constructor(prisma: PrismaService, tatumWithdrawal: TatumWithdrawalService, exchangeRateService: TatumExchangeRateService);
    getUsers(page: number, limit: number, search?: string): Promise<{
        users: ({
            profile: {
                id: string;
                userId: string;
                updatedAt: Date;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            }[];
        } & {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            status: import("@src/generated/client").$Enums.UserStatus;
            phone: string | null;
            email: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetToken: string | null;
            resetTokenExpires: Date | null;
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
            userId: string;
            updatedAt: Date;
            lastName: string | null;
            firstName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import("@src/generated/client").$Enums.UserStatus;
        phone: string | null;
        email: string | null;
        passwordHash: string;
        role: import("@src/generated/client").$Enums.Role;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetToken: string | null;
        resetTokenExpires: Date | null;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
    }>;
    getUserDetail(userId: string): Promise<{
        profile: {
            id: string;
            userId: string;
            updatedAt: Date;
            lastName: string | null;
            firstName: string | null;
            kycStatus: string;
            avatarUrl: string | null;
        } | null;
        wallets: {
            id: string;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            updatedAt: Date;
            version: number;
        }[];
        devices: {
            id: string;
            userId: string;
            createdAt: Date;
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
            userId: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            device: string | null;
            action: string;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            errorMessage: string | null;
        }[];
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import("@src/generated/client").$Enums.UserStatus;
        phone: string | null;
        email: string | null;
        role: import("@src/generated/client").$Enums.Role;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetToken: string | null;
        resetTokenExpires: Date | null;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
    }>;
    getAllWallets(page: number, limit: number, search?: string): Promise<{
        wallets: ({
            user: {
                profile: {
                    id: string;
                    userId: string;
                    updatedAt: Date;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                updatedAt: Date;
                createdAt: Date;
                status: import("@src/generated/client").$Enums.UserStatus;
                phone: string | null;
                email: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetToken: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
            };
        } & {
            id: string;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            updatedAt: Date;
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
                userId: string;
                updatedAt: Date;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
        } & {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            status: import("@src/generated/client").$Enums.UserStatus;
            phone: string | null;
            email: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetToken: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
        };
        ledgerEntries: ({
            transaction: {
                id: string;
                updatedAt: Date;
                walletId: string;
                amount: Prisma.Decimal;
                type: import("@src/generated/client").$Enums.LedgerType;
                reference: string;
                metadata: Prisma.JsonValue | null;
                createdAt: Date;
                status: string;
                fee: Prisma.Decimal;
            } | null;
        } & {
            id: string;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            balanceAfter: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
        })[];
        snapshots: {
            id: string;
            balance: Prisma.Decimal;
            walletId: string;
            createdAt: Date;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        updatedAt: Date;
        version: number;
    }>;
    getAllTransactions(page: number, limit: number): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        userId: string;
                        updatedAt: Date;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    phone: string | null;
                    email: string | null;
                    passwordHash: string;
                    role: import("@src/generated/client").$Enums.Role;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                };
            } & {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAllOrders(page: number, limit: number, search?: string): Promise<{
        orders: ({
            ad: {
                id: string;
                updatedAt: Date;
                version: number;
                type: import("@src/generated/client").$Enums.AdType;
                createdAt: Date;
                status: string;
                sellerId: string;
                asset: import("@src/generated/client").$Enums.Currency;
                price: Prisma.Decimal;
                quantity: Prisma.Decimal;
                minLimit: Prisma.Decimal;
                maxLimit: Prisma.Decimal;
                isSponsored: boolean;
            };
            seller: {
                profile: {
                    id: string;
                    userId: string;
                    updatedAt: Date;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                updatedAt: Date;
                createdAt: Date;
                status: import("@src/generated/client").$Enums.UserStatus;
                phone: string | null;
                email: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetToken: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
            };
            buyer: {
                profile: {
                    id: string;
                    userId: string;
                    updatedAt: Date;
                    lastName: string | null;
                    firstName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                updatedAt: Date;
                createdAt: Date;
                status: import("@src/generated/client").$Enums.UserStatus;
                phone: string | null;
                email: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetToken: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
            };
        } & {
            id: string;
            updatedAt: Date;
            version: number;
            createdAt: Date;
            status: import("@src/generated/client").$Enums.OrderStatus;
            adId: string;
            buyerId: string;
            sellerId: string;
            fiatAmount: Prisma.Decimal;
            cryptoAmount: Prisma.Decimal;
            feeAmount: Prisma.Decimal;
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
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            balanceAfter: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
        })[];
        ad: {
            id: string;
            updatedAt: Date;
            version: number;
            type: import("@src/generated/client").$Enums.AdType;
            createdAt: Date;
            status: string;
            sellerId: string;
            asset: import("@src/generated/client").$Enums.Currency;
            price: Prisma.Decimal;
            quantity: Prisma.Decimal;
            minLimit: Prisma.Decimal;
            maxLimit: Prisma.Decimal;
            isSponsored: boolean;
        };
        seller: {
            profile: {
                id: string;
                userId: string;
                updatedAt: Date;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            }[];
        } & {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            status: import("@src/generated/client").$Enums.UserStatus;
            phone: string | null;
            email: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetToken: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
        };
        buyer: {
            profile: {
                id: string;
                userId: string;
                updatedAt: Date;
                lastName: string | null;
                firstName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            wallets: {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            }[];
        } & {
            id: string;
            updatedAt: Date;
            createdAt: Date;
            status: import("@src/generated/client").$Enums.UserStatus;
            phone: string | null;
            email: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetToken: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
        };
    } & {
        id: string;
        updatedAt: Date;
        version: number;
        createdAt: Date;
        status: import("@src/generated/client").$Enums.OrderStatus;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    getBlockchainTransactions(page: number, limit: number): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        userId: string;
                        updatedAt: Date;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    phone: string | null;
                    email: string | null;
                    passwordHash: string;
                    role: import("@src/generated/client").$Enums.Role;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                };
            } & {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getFailedTransactions(page: number, limit: number): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        userId: string;
                        updatedAt: Date;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    phone: string | null;
                    email: string | null;
                    passwordHash: string;
                    role: import("@src/generated/client").$Enums.Role;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                };
            } & {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
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
    getPaymentStats(): Promise<{
        totalDeposits: number | Prisma.Decimal;
        totalWithdrawals: number | Prisma.Decimal;
    }>;
    getPaymentTransactions(page: number, limit: number): Promise<{
        transactions: ({
            wallet: {
                user: {
                    profile: {
                        id: string;
                        userId: string;
                        updatedAt: Date;
                        lastName: string | null;
                        firstName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    phone: string | null;
                    email: string | null;
                    passwordHash: string;
                    role: import("@src/generated/client").$Enums.Role;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                };
            } & {
                id: string;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            updatedAt: Date;
            walletId: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            status: string;
            fee: Prisma.Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAuditLogs(page: number, limit: number, filters?: {
        action?: string;
        resource?: string;
        userId?: string;
        success?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }): Promise<{
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
            userId: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            device: string | null;
            action: string;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
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
    getUserAuditTrail(userId: string, page: number, limit: number): Promise<{
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
            userId: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            device: string | null;
            action: string;
            resource: string | null;
            success: boolean;
            ipAddress: string | null;
            actorId: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            errorMessage: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
