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
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            }[];
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
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
    updateUserStatus(userId: string, status: UserStatus): Promise<{
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
        role: import("@src/generated/client").$Enums.Role;
        status: import("@src/generated/client").$Enums.UserStatus;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetTokenExpires: Date | null;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getUserDetail(userId: string): Promise<{
        profile: {
            firstName: string | null;
            lastName: string | null;
            avatarUrl: string | null;
            id: string;
            updatedAt: Date;
            userId: string;
            kycStatus: string;
        } | null;
        wallets: {
            id: string;
            updatedAt: Date;
            userId: string;
            version: number;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
        }[];
        devices: {
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
        }[];
        securityLogs: {
            device: string | null;
            id: string;
            createdAt: Date;
            userId: string;
            ipAddress: string | null;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
            actorId: string | null;
            resourceId: string | null;
            oldValue: import("@src/generated/client/runtime/library").JsonValue | null;
            newValue: import("@src/generated/client/runtime/library").JsonValue | null;
            errorMessage: string | null;
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
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllWallets(page?: string, limit?: string, search?: string): Promise<{
        wallets: ({
            user: {
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
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            version: number;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
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
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        ledgerEntries: ({
            transaction: {
                type: import("@src/generated/client").$Enums.LedgerType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                metadata: import("@src/generated/client/runtime/library").JsonValue | null;
                walletId: string;
                amount: import("@src/generated/client/runtime/library").Decimal;
                reference: string;
                fee: import("@src/generated/client/runtime/library").Decimal;
            } | null;
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
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
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
    }>;
    getAllTransactions(page?: string, limit?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
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
                    role: import("@src/generated/client").$Enums.Role;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                sellerId: string;
                version: number;
                asset: import("@src/generated/client").$Enums.Currency;
                price: import("@src/generated/client/runtime/library").Decimal;
                quantity: import("@src/generated/client/runtime/library").Decimal;
                minLimit: import("@src/generated/client/runtime/library").Decimal;
                maxLimit: import("@src/generated/client/runtime/library").Decimal;
                isSponsored: boolean;
            };
            seller: {
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
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
            buyer: {
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
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
            version: number;
            fiatAmount: import("@src/generated/client/runtime/library").Decimal;
            cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            adId: string;
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
            version: number;
            asset: import("@src/generated/client").$Enums.Currency;
            price: import("@src/generated/client/runtime/library").Decimal;
            quantity: import("@src/generated/client/runtime/library").Decimal;
            minLimit: import("@src/generated/client/runtime/library").Decimal;
            maxLimit: import("@src/generated/client/runtime/library").Decimal;
            isSponsored: boolean;
        };
        ledgerEntries: ({
            wallet: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        })[];
        seller: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            }[];
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        buyer: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            }[];
        } & {
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            passwordHash: string;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        fraudFlagged: boolean;
        sellerId: string;
        buyerId: string;
        version: number;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        adId: string;
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
                    role: import("@src/generated/client").$Enums.Role;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
                    role: import("@src/generated/client").$Enums.Role;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
    getPaymentTransactions(page?: string, limit?: string, search?: string, status?: string, type?: string, startDate?: string, endDate?: string): Promise<{
        transactions: ({
            wallet: {
                user: {
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
                    role: import("@src/generated/client").$Enums.Role;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    failedLoginAttempts: number;
                    lockedUntil: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: import("@src/generated/client/runtime/library").Decimal;
                reservedBalance: import("@src/generated/client/runtime/library").Decimal;
                address: string | null;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            fee: import("@src/generated/client/runtime/library").Decimal;
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
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            version: number;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: import("@src/generated/client/runtime/library").Decimal;
            reservedBalance: import("@src/generated/client/runtime/library").Decimal;
            address: string | null;
        };
        ledgerEntries: {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            amount: import("@src/generated/client/runtime/library").Decimal;
            reference: string;
            balanceAfter: import("@src/generated/client/runtime/library").Decimal;
        }[];
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@src/generated/client/runtime/library").JsonValue | null;
        walletId: string;
        amount: import("@src/generated/client/runtime/library").Decimal;
        reference: string;
        fee: import("@src/generated/client/runtime/library").Decimal;
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
            ipAddress: string | null;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
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
            ipAddress: string | null;
            metadata: import("@src/generated/client/runtime/library").JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
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
    updateFeeConfig(key: string, value: number): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: import("@src/generated/client/runtime/library").Decimal;
        label: string;
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
