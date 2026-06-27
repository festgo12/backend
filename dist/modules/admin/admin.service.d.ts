import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus } from '@prisma/client';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getUsers(page: number, limit: number, search?: string): Promise<{
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
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            }[];
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
        role: import(".prisma/client").$Enums.Role;
        status: import(".prisma/client").$Enums.UserStatus;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        resetTokenExpires: Date | null;
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
            currency: import(".prisma/client").$Enums.Currency;
            balance: import("@prisma/client/runtime/library").Decimal;
            reservedBalance: import("@prisma/client/runtime/library").Decimal;
            address: string | null;
            version: number;
        }[];
        devices: {
            id: string;
            userId: string;
            deviceId: string;
            fingerprint: string;
            lastLogin: Date;
            userAgent: string | null;
            ipAddress: string | null;
        }[];
        securityLogs: {
            id: string;
            createdAt: Date;
            userId: string;
            ipAddress: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            action: string;
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
    getAllWallets(page: number, limit: number, search?: string): Promise<{
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
                role: import(".prisma/client").$Enums.Role;
                status: import(".prisma/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            currency: import(".prisma/client").$Enums.Currency;
            balance: import("@prisma/client/runtime/library").Decimal;
            reservedBalance: import("@prisma/client/runtime/library").Decimal;
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
            role: import(".prisma/client").$Enums.Role;
            status: import(".prisma/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            resetTokenExpires: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        ledgerEntries: ({
            transaction: {
                type: import(".prisma/client").$Enums.LedgerType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                walletId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                fee: import("@prisma/client/runtime/library").Decimal;
                reference: string;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            orderId: string | null;
            balanceAfter: import("@prisma/client/runtime/library").Decimal;
        })[];
        snapshots: {
            id: string;
            createdAt: Date;
            balance: import("@prisma/client/runtime/library").Decimal;
            walletId: string;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import(".prisma/client").$Enums.Currency;
        balance: import("@prisma/client/runtime/library").Decimal;
        reservedBalance: import("@prisma/client/runtime/library").Decimal;
        address: string | null;
        version: number;
    }>;
    getAllTransactions(page: number, limit: number): Promise<{
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
                    role: import(".prisma/client").$Enums.Role;
                    status: import(".prisma/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            };
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
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
                type: import(".prisma/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
                asset: import(".prisma/client").$Enums.Currency;
                price: import("@prisma/client/runtime/library").Decimal;
                quantity: import("@prisma/client/runtime/library").Decimal;
                minLimit: import("@prisma/client/runtime/library").Decimal;
                maxLimit: import("@prisma/client/runtime/library").Decimal;
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
                role: import(".prisma/client").$Enums.Role;
                status: import(".prisma/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
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
                role: import(".prisma/client").$Enums.Role;
                status: import(".prisma/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            expiresAt: Date;
            adId: string;
            buyerId: string;
            sellerId: string;
            fiatAmount: import("@prisma/client/runtime/library").Decimal;
            cryptoAmount: import("@prisma/client/runtime/library").Decimal;
            feeAmount: import("@prisma/client/runtime/library").Decimal;
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
            type: import(".prisma/client").$Enums.AdType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            sellerId: string;
            asset: import(".prisma/client").$Enums.Currency;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: import("@prisma/client/runtime/library").Decimal;
            minLimit: import("@prisma/client/runtime/library").Decimal;
            maxLimit: import("@prisma/client/runtime/library").Decimal;
            isSponsored: boolean;
        };
        ledgerEntries: ({
            wallet: {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            };
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transactionId: string | null;
            orderId: string | null;
            balanceAfter: import("@prisma/client/runtime/library").Decimal;
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
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            }[];
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
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            }[];
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
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        expiresAt: Date;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: import("@prisma/client/runtime/library").Decimal;
        cryptoAmount: import("@prisma/client/runtime/library").Decimal;
        feeAmount: import("@prisma/client/runtime/library").Decimal;
        fraudFlagged: boolean;
    }>;
    getBlockchainTransactions(page: number, limit: number): Promise<{
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
                    role: import(".prisma/client").$Enums.Role;
                    status: import(".prisma/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            };
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
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
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            };
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getBlockchainStats(): Promise<void>;
    getPaymentStats(): Promise<{
        totalDeposits: number | import("@prisma/client/runtime/library").Decimal;
        totalWithdrawals: number | import("@prisma/client/runtime/library").Decimal;
    }>;
    getPaymentTransactions(page: number, limit: number): Promise<{
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
                    role: import(".prisma/client").$Enums.Role;
                    status: import(".prisma/client").$Enums.UserStatus;
                    twoFactorEnabled: boolean;
                    twoFactorSecret: string | null;
                    resetTokenExpires: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                currency: import(".prisma/client").$Enums.Currency;
                balance: import("@prisma/client/runtime/library").Decimal;
                reservedBalance: import("@prisma/client/runtime/library").Decimal;
                address: string | null;
                version: number;
            };
        } & {
            type: import(".prisma/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            walletId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            fee: import("@prisma/client/runtime/library").Decimal;
            reference: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
