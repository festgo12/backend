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
        status: import("@src/generated/client").$Enums.OrderStatus;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        createdAt: Date;
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
        status: import("@src/generated/client").$Enums.OrderStatus;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        createdAt: Date;
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
        status: string;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        type: import("@src/generated/client").$Enums.AdType;
        createdAt: Date;
        sellerId: string;
        quantity: Prisma.Decimal;
        price: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        asset: import("@src/generated/client").$Enums.Currency;
        isSponsored: boolean;
    }>;
    adminDeleteAd(adId: string): Promise<{
        status: string;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        type: import("@src/generated/client").$Enums.AdType;
        createdAt: Date;
        sellerId: string;
        quantity: Prisma.Decimal;
        price: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        asset: import("@src/generated/client").$Enums.Currency;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
            updatedAt: Date;
            createdAt: Date;
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
        status: import("@src/generated/client").$Enums.UserStatus;
        id: string;
        updatedAt: Date;
        createdAt: Date;
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
            address: string | null;
            id: string;
            chain: string | null;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            derivationIndex: number | null;
            isFrozen: boolean;
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
        status: import("@src/generated/client").$Enums.UserStatus;
        id: string;
        updatedAt: Date;
        createdAt: Date;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
                updatedAt: Date;
                createdAt: Date;
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
            address: string | null;
            id: string;
            chain: string | null;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            derivationIndex: number | null;
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
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
            updatedAt: Date;
            createdAt: Date;
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
        ledgerEntries: ({
            transaction: {
                status: string;
                id: string;
                updatedAt: Date;
                type: import("@src/generated/client").$Enums.LedgerType;
                amount: Prisma.Decimal;
                fee: Prisma.Decimal;
                reference: string;
                metadata: Prisma.JsonValue | null;
                resolvedAt: Date | null;
                createdAt: Date;
                walletId: string;
            } | null;
        } & {
            id: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            walletId: string;
            balanceAfter: Prisma.Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
        snapshots: {
            id: string;
            balance: Prisma.Decimal;
            createdAt: Date;
            walletId: string;
            ledgerId: string | null;
        }[];
    } & {
        address: string | null;
        id: string;
        chain: string | null;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        derivationIndex: number | null;
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
        status: string;
        id: string;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        walletId: string;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            status: string;
            id: string;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            walletId: string;
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
                status: string;
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                type: import("@src/generated/client").$Enums.AdType;
                createdAt: Date;
                sellerId: string;
                quantity: Prisma.Decimal;
                price: Prisma.Decimal;
                minLimit: Prisma.Decimal;
                maxLimit: Prisma.Decimal;
                asset: import("@src/generated/client").$Enums.Currency;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
                updatedAt: Date;
                createdAt: Date;
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
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
                updatedAt: Date;
                createdAt: Date;
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
            status: import("@src/generated/client").$Enums.OrderStatus;
            id: string;
            chain: string | null;
            updatedAt: Date;
            version: number;
            createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            id: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            walletId: string;
            balanceAfter: Prisma.Decimal;
            transactionId: string | null;
            orderId: string | null;
        })[];
        ad: {
            status: string;
            id: string;
            chain: string | null;
            updatedAt: Date;
            version: number;
            type: import("@src/generated/client").$Enums.AdType;
            createdAt: Date;
            sellerId: string;
            quantity: Prisma.Decimal;
            price: Prisma.Decimal;
            minLimit: Prisma.Decimal;
            maxLimit: Prisma.Decimal;
            asset: import("@src/generated/client").$Enums.Currency;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
            updatedAt: Date;
            createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            }[];
        } & {
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
            updatedAt: Date;
            createdAt: Date;
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
        status: import("@src/generated/client").$Enums.OrderStatus;
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        createdAt: Date;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            status: string;
            id: string;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            walletId: string;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            status: string;
            id: string;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            walletId: string;
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
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
                    updatedAt: Date;
                    createdAt: Date;
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
                address: string | null;
                id: string;
                chain: string | null;
                updatedAt: Date;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                derivationIndex: number | null;
                isFrozen: boolean;
                version: number;
            };
        } & {
            status: string;
            id: string;
            updatedAt: Date;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            fee: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            resolvedAt: Date | null;
            createdAt: Date;
            walletId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getPaymentTransactionDetail(transactionId: string): Promise<{
        ledgerEntries: {
            id: string;
            type: import("@src/generated/client").$Enums.LedgerType;
            amount: Prisma.Decimal;
            reference: string;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
            walletId: string;
            balanceAfter: Prisma.Decimal;
            transactionId: string | null;
            orderId: string | null;
        }[];
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
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
                updatedAt: Date;
                createdAt: Date;
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
            address: string | null;
            id: string;
            chain: string | null;
            updatedAt: Date;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            derivationIndex: number | null;
            isFrozen: boolean;
            version: number;
        };
    } & {
        status: string;
        id: string;
        updatedAt: Date;
        type: import("@src/generated/client").$Enums.LedgerType;
        amount: Prisma.Decimal;
        fee: Prisma.Decimal;
        reference: string;
        metadata: Prisma.JsonValue | null;
        resolvedAt: Date | null;
        createdAt: Date;
        walletId: string;
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
    getFeeConfigs(): Promise<{
        value: Prisma.Decimal;
        id: string;
        updatedAt: Date;
        key: string;
        label: string;
    }[]>;
    updateFeeConfig(key: string, value: number): Promise<{
        value: Prisma.Decimal;
        id: string;
        updatedAt: Date;
        key: string;
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
            status: string;
            id: string;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
            amount: Prisma.Decimal;
            reference: string;
            createdAt: Date;
        }[];
    }>;
    refreshSanctions(): Promise<import("../security/crypto-risk.service").RefreshResult>;
    getWithdrawalJobs(page: number, limit: number, status?: string): Promise<{
        jobs: {
            status: string;
            id: string;
            chain: string | null;
            updatedAt: Date;
            currency: import("@src/generated/client").$Enums.Currency;
            amount: Prisma.Decimal;
            metadata: Prisma.JsonValue | null;
            createdAt: Date;
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
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
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
                wallet: {
                    currency: import("@src/generated/client").$Enums.Currency;
                    user: {
                        email: string | null;
                    };
                };
                amount: Prisma.Decimal;
                reference: string;
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
