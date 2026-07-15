import { AdminService } from './admin.service';
import { TatumExchangeRateService } from '../tatum/tatum-exchange-rate.service';
import { TatumDepositService } from '../tatum/tatum-deposit.service';
import { TatumWebhookService } from '../tatum/tatum-webhook.service';
import { UserStatus } from '@src/generated/client';
export declare class AdminController {
    private readonly adminService;
    private readonly exchangeRateService;
    private readonly depositService;
    private readonly webhookService;
    constructor(adminService: AdminService, exchangeRateService: TatumExchangeRateService, depositService: TatumDepositService, webhookService: TatumWebhookService);
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
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                version: number;
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
        resetToken: string | null;
        resetTokenExpires: Date | null;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
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
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
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
            device: string | null;
            userId: string;
            action: string;
            resource: string | null;
            success: boolean;
            actorId: string | null;
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
        resetToken: string | null;
        resetTokenExpires: Date | null;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
    }>;
    getAllWallets(page?: string, limit?: string, search?: string): Promise<{
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
                resetToken: string | null;
                resetTokenExpires: Date | null;
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
                reference: string;
                walletId: string;
                type: import("@src/generated/client").$Enums.LedgerType;
                status: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                fee: import("@src/generated/client/runtime/library").Decimal;
                metadata: import("@src/generated/client/runtime/library").JsonValue | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            transactionId: string | null;
            orderId: string | null;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        })[];
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
            resetToken: string | null;
            resetTokenExpires: Date | null;
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
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
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
                version: number;
            };
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
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
    getAllOrders(page?: string, limit?: string, search?: string): Promise<{
        orders: ({
            ad: {
                id: string;
                type: import("@src/generated/client").$Enums.AdType;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
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
                resetToken: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
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
                resetToken: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
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
                version: number;
            };
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            transactionId: string | null;
            orderId: string | null;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        })[];
        ad: {
            id: string;
            type: import("@src/generated/client").$Enums.AdType;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
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
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                version: number;
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
            resetToken: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
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
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
                version: number;
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
            resetToken: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
        };
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
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
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
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
                version: number;
            };
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
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
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
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
                version: number;
            };
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
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
    syncAllBalances(): Promise<{
        total: number;
        synced: number;
        discrepancies: number;
    }>;
    getPaymentStats(): Promise<{
        totalDeposits: number | import("@src/generated/client/runtime/library").Decimal;
        totalWithdrawals: number | import("@src/generated/client/runtime/library").Decimal;
    }>;
    getPaymentTransactions(page?: string, limit?: string): Promise<{
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
                    resetToken: string | null;
                    resetTokenExpires: Date | null;
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
                version: number;
            };
        } & {
            id: string;
            reference: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            status: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            fee: import("@src/generated/client/runtime/library").Decimal;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
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
    getExchangeRates(): {
        rates: Record<string, number>;
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
                    firstName: string | null;
                    lastName: string | null;
                } | null;
                email: string | null;
            };
        } & {
            id: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            device: string | null;
            userId: string;
            action: string;
            resource: string | null;
            success: boolean;
            actorId: string | null;
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
                id: string;
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
                email: string | null;
            };
        } & {
            id: string;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            createdAt: Date;
            device: string | null;
            userId: string;
            action: string;
            resource: string | null;
            success: boolean;
            actorId: string | null;
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
    getWebhookSubscriptions(): {
        total: number;
        byChain: Record<string, number>;
        byType: Record<string, number>;
        subscriptions: import("../tatum/tatum-webhook.service").WebhookSubscription[];
    };
    initOutgoingWebhooks(): Promise<{
        success: boolean;
        message: string;
    }>;
    cancelWebhook(subscriptionId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
