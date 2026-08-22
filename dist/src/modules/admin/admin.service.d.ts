import { PrismaService } from '../../core/database/prisma.service';
import { UserStatus, Currency } from '@src/generated/client';
import { Prisma } from '@src/generated/client';
import { CryptoWithdrawalService } from '../crypto/crypto-withdrawal.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { CryptoConfigService } from '../crypto/crypto-config.service';
import { DepositAddressRegistry } from '../crypto/deposit-address-registry.service';
import { HdWalletService } from '../crypto/hd-wallet.service';
import { ChainClientService } from '../crypto/chain-client.service';
import { ReconciliationService } from '../crypto/reconciliation.service';
import { SweepService } from '../crypto/sweep.service';
import { PaystackService } from '../paystack/paystack.service';
import { WalletService } from '../wallet/wallet.service';
export declare class AdminService {
    private prisma;
    private readonly cryptoWithdrawal;
    private readonly exchangeRateService;
    private readonly cryptoConfig;
    private readonly depositRegistry;
    private readonly hdWallet;
    private readonly chainClient;
    private readonly paystackService;
    private readonly walletService;
    private readonly reconciliationService;
    private readonly sweepService;
    constructor(prisma: PrismaService, cryptoWithdrawal: CryptoWithdrawalService, exchangeRateService: ExchangeRateService, cryptoConfig: CryptoConfigService, depositRegistry: DepositAddressRegistry, hdWallet: HdWalletService, chainClient: ChainClientService, paystackService: PaystackService, walletService: WalletService, reconciliationService: ReconciliationService, sweepService: SweepService);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalOrders: number;
        completedOrders: number;
        pendingDisputes: number;
        totalRevenue: number;
        completionRate: number;
    }>;
    flagOrder(orderId: string): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        fraudFlagged: boolean;
        sellerId: string;
        buyerId: string;
        version: number;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        adId: string;
    }>;
    releaseOrder(orderId: string): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        fraudFlagged: boolean;
        sellerId: string;
        buyerId: string;
        version: number;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        adId: string;
    }>;
    adminUpdateAd(adId: string, data: Record<string, unknown>): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Prisma.Decimal;
        quantity: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        isSponsored: boolean;
    }>;
    adminDeleteAd(adId: string): Promise<{
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Prisma.Decimal;
        quantity: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        isSponsored: boolean;
    }>;
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
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
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
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
            isFrozen: boolean;
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
            metadata: Prisma.JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
            actorId: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
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
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            version: number;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
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
                metadata: Prisma.JsonValue | null;
                amount: Prisma.Decimal;
                fee: Prisma.Decimal;
                walletId: string;
                reference: string;
                resolvedAt: Date | null;
            } | null;
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
            balanceAfter: Prisma.Decimal;
        })[];
        snapshots: {
            id: string;
            createdAt: Date;
            balance: Prisma.Decimal;
            walletId: string;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
    }>;
    getFeeWallets(): Promise<{
        wallets: {
            id: string;
            currency: import("@src/generated/client").$Enums.Currency;
            address: string | null;
            balance: number;
            reservedBalance: number;
            available: number;
            ledgerEntryCount: number;
            updatedAt: Date;
        }[];
        total: number;
    }>;
    sweepFeeWallet(currency: Currency, address: string, amount?: number): Promise<{
        txId: string;
        status: string;
    }>;
    creditTestFunds(email: string, currency: Currency, amount: number): Promise<{
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
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
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
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
    getAllOrders(page: number, limit: number, search?: string): Promise<{
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
                price: Prisma.Decimal;
                quantity: Prisma.Decimal;
                minLimit: Prisma.Decimal;
                maxLimit: Prisma.Decimal;
                isSponsored: boolean;
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
                createdAt: Date;
                updatedAt: Date;
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
            fiatAmount: Prisma.Decimal;
            cryptoAmount: Prisma.Decimal;
            feeAmount: Prisma.Decimal;
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
            price: Prisma.Decimal;
            quantity: Prisma.Decimal;
            minLimit: Prisma.Decimal;
            maxLimit: Prisma.Decimal;
            isSponsored: boolean;
        };
        ledgerEntries: ({
            wallet: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
            balanceAfter: Prisma.Decimal;
        })[];
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
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
            createdAt: Date;
            updatedAt: Date;
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
            wallets: {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
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
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        adId: string;
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
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
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
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
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
    getPaymentTransactions(page: number, limit: number, filters?: {
        search?: string;
        status?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
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
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                updatedAt: Date;
                userId: string;
                version: number;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                chain: string | null;
                isFrozen: boolean;
            };
        } & {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
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
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            updatedAt: Date;
            userId: string;
            version: number;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            derivationIndex: number | null;
            chain: string | null;
            isFrozen: boolean;
        };
        ledgerEntries: {
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            amount: Prisma.Decimal;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
            balanceAfter: Prisma.Decimal;
        }[];
    } & {
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        walletId: string;
        reference: string;
        resolvedAt: Date | null;
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
            metadata: Prisma.JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
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
    getFeeConfigs(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: Prisma.Decimal;
        label: string;
    }[]>;
    updateFeeConfig(key: string, value: number): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: Prisma.Decimal;
        label: string;
    }>;
    getFeeValue(key: string): Promise<number>;
    getUserAuditTrail(userId: string, page: number, limit: number): Promise<{
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
            metadata: Prisma.JsonValue | null;
            success: boolean;
            resource: string | null;
            action: string;
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
    getCryptoSystemStatus(): Promise<{
        provider: "alchemy";
        network: string;
        isTestnet: boolean;
        webhookProviders: {
            evm: string;
            btc: string;
        };
        confirmations: {
            eth: number;
            btc: number;
        };
        depositSweepThreshold: number;
        registrySize: number;
        masterWallets: {
            evm: string;
            btc: string;
        };
        recentSweeps: {
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
            id: string;
            status: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            reference: string;
        }[];
    }>;
    getWithdrawalJobs(page: number, limit: number, status?: string): Promise<{
        jobs: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            currency: import("@src/generated/client").$Enums.Currency;
            destination: string;
            amount: Prisma.Decimal;
            walletId: string;
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
        };
        balances: ({
            currency: "BTC";
            address: string;
            balance: number;
            error?: undefined;
        } | {
            currency: "NGN" | "ETH" | "USDT" | "USDC";
            address: string;
            balance: number;
            error?: undefined;
        } | {
            currency: import("@src/generated/client").$Enums.Currency;
            address: string;
            balance: number;
            error: string;
        })[];
    }>;
    reconcileAll(): Promise<import("../crypto/reconciliation.service").ReconciliationResult>;
    reconcileCurrency(currency: Currency): Promise<import("../crypto/reconciliation.service").ReconciliationResult>;
    triggerSweepAll(): Promise<{
        success: boolean;
        message: string;
    }>;
    getBtcHistory(page: number, pageSize: number): Promise<{
        transactions: {
            dbMatch: boolean;
            dbTransaction: {
                wallet: {
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
                status: string;
                amount: Prisma.Decimal;
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
    getEvmHistory(address: string, page: number): Promise<{
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
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
                status: string;
                amount: Prisma.Decimal;
                reference: string;
            } | null;
        }[];
        page: number;
    }>;
}
