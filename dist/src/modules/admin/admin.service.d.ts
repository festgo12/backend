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
import { SanctionedAddressRepository } from '../security/crypto-risk.service';
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
    private readonly sanctions;
    private readonly logger;
    constructor(prisma: PrismaService, cryptoWithdrawal: CryptoWithdrawalService, exchangeRateService: ExchangeRateService, cryptoConfig: CryptoConfigService, depositRegistry: DepositAddressRegistry, hdWallet: HdWalletService, chainClient: ChainClientService, paystackService: PaystackService, walletService: WalletService, reconciliationService: ReconciliationService, sweepService: SweepService, sanctions: SanctionedAddressRepository);
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
        chain: string | null;
        version: number;
        adId: string;
        buyerId: string;
        sellerId: string;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
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
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    private static readonly ALLOWED_AD_FIELDS;
    adminUpdateAd(adId: string, data: Record<string, unknown>): Promise<{
        id: string;
        type: import("@src/generated/client").$Enums.AdType;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        chain: string | null;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        sellerId: string;
        quantity: Prisma.Decimal;
        price: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
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
        quantity: Prisma.Decimal;
        price: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        isSponsored: boolean;
    }>;
    getUsers(page: number, limit: number, search?: string): Promise<{
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
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
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            userId: string;
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
    getAllWallets(page: number, limit: number, search?: string, currency?: Currency, chain?: string): Promise<{
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
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
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
                amount: Prisma.Decimal;
                fee: Prisma.Decimal;
                reference: string;
                metadata: Prisma.JsonValue | null;
                resolvedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
            } | null;
        } & {
            id: string;
            walletId: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            balanceAfter: Prisma.Decimal;
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
            balance: Prisma.Decimal;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
        version: number;
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
    sweepFeeWallet(currency: Currency, address: string, amount?: number, chain?: string): Promise<{
        txId: string;
        status: string;
    }>;
    creditTestFunds(email: string, currency: Currency, amount: number, chain?: string): Promise<{
        id: string;
        walletId: string;
        type: import("@src/generated/client").$Enums.LedgerType;
        status: string;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllTransactions(page: number, limit: number, currency?: string, chain?: string): Promise<{
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
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
    getAllOrders(page: number, limit: number, search?: string, chain?: string): Promise<{
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
                quantity: Prisma.Decimal;
                price: Prisma.Decimal;
                minLimit: Prisma.Decimal;
                maxLimit: Prisma.Decimal;
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
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            balanceAfter: Prisma.Decimal;
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
            quantity: Prisma.Decimal;
            price: Prisma.Decimal;
            minLimit: Prisma.Decimal;
            maxLimit: Prisma.Decimal;
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        fraudFlagged: boolean;
    }>;
    getBlockchainTransactions(page: number, limit: number, chain?: string): Promise<{
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
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
    getFailedTransactions(page: number, limit: number): Promise<{
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
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
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
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
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
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
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            balanceAfter: Prisma.Decimal;
            transactionId: string | null;
            orderId: string | null;
        }[];
    } & {
        id: string;
        walletId: string;
        type: import("@src/generated/client").$Enums.LedgerType;
        status: string;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            userId: string;
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
                id: string;
                profile: {
                    lastName: string | null;
                    firstName: string | null;
                } | null;
                email: string | null;
            };
        } & {
            id: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            userId: string;
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
            amount: Prisma.Decimal;
            reference: string;
            createdAt: Date;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
        }[];
    }>;
    refreshSanctions(): Promise<import("../security/crypto-risk.service").RefreshResult>;
    getWithdrawalJobs(page: number, limit: number, status?: string): Promise<{
        jobs: {
            id: string;
            walletId: string;
            status: string;
            amount: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
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
    triggerSweepAll(): Promise<{
        success: boolean;
        message: string;
        summary: import("../crypto/sweep.service").SweepRunSummary;
        swept: number;
    }>;
    getBtcHistory(page: number, pageSize: number): Promise<{
        transactions: {
            dbMatch: boolean;
            dbTransaction: {
                status: string;
                amount: Prisma.Decimal;
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
    getEvmHistory(address: string, page: number, chain?: string): Promise<{
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
                amount: Prisma.Decimal;
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
    triggerSweepChain(chain: string): Promise<import("../crypto/sweep.service").SweepRunSummary>;
    getSweepConfig(): Promise<{
        globalThresholdUsd: number;
        chains: {
            chain: string;
            enabled: boolean;
            thresholdUsd: number | null;
            usesGlobalThreshold: boolean;
        }[];
    }>;
    updateSweepConfig(chain: string, changes: {
        enabled?: boolean;
        thresholdUsd?: number | null;
    }): Promise<{
        chain: string;
        enabled: boolean;
        thresholdUsd: number | null;
    }>;
    getTronHistory(address: string, page: number): Promise<{
        address: string;
        chain: string;
        transfers: Record<string, unknown>[];
        page: number;
        total: number;
    }>;
    getSolHistory(address: string, page: number): Promise<{
        address: string;
        chain: string;
        transfers: Record<string, unknown>[];
        page: number;
        total: number;
    }>;
    pullEvmDeposits(chain: string, address: string): Promise<{
        chain: string;
        address: string;
        found: number;
        credited: number;
        alreadyRecorded: number;
        skipped: string[];
        errors: string[];
    }>;
    private walletOnAdminChain;
}
