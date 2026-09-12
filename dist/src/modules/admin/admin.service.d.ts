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
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        fraudFlagged: boolean;
    }>;
    releaseOrder(orderId: string): Promise<{
        status: import("@src/generated/client").$Enums.OrderStatus;
        id: string;
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        fraudFlagged: boolean;
    }>;
    private static readonly ALLOWED_AD_FIELDS;
    adminUpdateAd(adId: string, data: Record<string, unknown>): Promise<{
        status: string;
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        sellerId: string;
        chain: string | null;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        asset: import("@src/generated/client").$Enums.Currency;
        price: Prisma.Decimal;
        quantity: Prisma.Decimal;
        minLimit: Prisma.Decimal;
        maxLimit: Prisma.Decimal;
        isSponsored: boolean;
    }>;
    adminDeleteAd(adId: string): Promise<{
        status: string;
        type: import("@src/generated/client").$Enums.AdType;
        id: string;
        sellerId: string;
        chain: string | null;
        createdAt: Date;
        updatedAt: Date;
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
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
        } & {
            isSystem: boolean;
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
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
        isSystem: boolean;
        status: import("@src/generated/client").$Enums.UserStatus;
        id: string;
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
            chain: string | null;
            updatedAt: Date;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            derivationIndex: number | null;
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
            id: string;
            createdAt: Date;
            userId: string;
            device: string | null;
            ipAddress: string | null;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            metadata: Prisma.JsonValue | null;
            success: boolean;
            errorMessage: string | null;
        }[];
        isSystem: boolean;
        status: import("@src/generated/client").$Enums.UserStatus;
        id: string;
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
    }>;
    getAllWallets(page: number, limit: number, search?: string, currency?: Currency, chain?: string): Promise<{
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
                isSystem: boolean;
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
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
            };
        } & {
            id: string;
            chain: string | null;
            updatedAt: Date;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
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
        ledgerEntries: ({
            transaction: {
                status: string;
                amount: Prisma.Decimal;
                type: import("@src/generated/client").$Enums.LedgerType;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                metadata: Prisma.JsonValue | null;
                walletId: string;
                reference: string;
                fee: Prisma.Decimal;
                resolvedAt: Date | null;
            } | null;
        } & {
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            balanceAfter: Prisma.Decimal;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
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
            isSystem: boolean;
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
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
        };
        snapshots: {
            id: string;
            createdAt: Date;
            balance: Prisma.Decimal;
            walletId: string;
            ledgerId: string | null;
        }[];
    } & {
        id: string;
        chain: string | null;
        updatedAt: Date;
        version: number;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: Prisma.Decimal;
        reservedBalance: Prisma.Decimal;
        address: string | null;
        derivationIndex: number | null;
        isFrozen: boolean;
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
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        reference: string;
        fee: Prisma.Decimal;
        resolvedAt: Date | null;
    }>;
    getAllTransactions(page: number, limit: number, currency?: string, chain?: string): Promise<{
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
                    isSystem: boolean;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
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
                };
            } & {
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            status: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            reference: string;
            fee: Prisma.Decimal;
            resolvedAt: Date | null;
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
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                sellerId: string;
                chain: string | null;
                createdAt: Date;
                updatedAt: Date;
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
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
            } & {
                isSystem: boolean;
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
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
                isSystem: boolean;
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
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
            };
        } & {
            status: import("@src/generated/client").$Enums.OrderStatus;
            id: string;
            adId: string;
            buyerId: string;
            sellerId: string;
            chain: string | null;
            fiatAmount: Prisma.Decimal;
            cryptoAmount: Prisma.Decimal;
            feeAmount: Prisma.Decimal;
            expiresAt: Date;
            createdAt: Date;
            updatedAt: Date;
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
            status: string;
            type: import("@src/generated/client").$Enums.AdType;
            id: string;
            sellerId: string;
            chain: string | null;
            createdAt: Date;
            updatedAt: Date;
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
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
        } & {
            isSystem: boolean;
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
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
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            }[];
        } & {
            isSystem: boolean;
            status: import("@src/generated/client").$Enums.UserStatus;
            id: string;
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
        };
        ledgerEntries: ({
            wallet: {
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            balanceAfter: Prisma.Decimal;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
        })[];
    } & {
        status: import("@src/generated/client").$Enums.OrderStatus;
        id: string;
        adId: string;
        buyerId: string;
        sellerId: string;
        chain: string | null;
        fiatAmount: Prisma.Decimal;
        cryptoAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
        version: number;
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
                        firstName: string | null;
                        lastName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    isSystem: boolean;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
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
                };
            } & {
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            status: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            reference: string;
            fee: Prisma.Decimal;
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
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        firstName: string | null;
                        lastName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    isSystem: boolean;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
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
                };
            } & {
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            status: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            reference: string;
            fee: Prisma.Decimal;
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
                        id: string;
                        updatedAt: Date;
                        userId: string;
                        firstName: string | null;
                        lastName: string | null;
                        kycStatus: string;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    isSystem: boolean;
                    status: import("@src/generated/client").$Enums.UserStatus;
                    id: string;
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
                };
            } & {
                id: string;
                chain: string | null;
                updatedAt: Date;
                version: number;
                userId: string;
                currency: import("@src/generated/client").$Enums.Currency;
                balance: Prisma.Decimal;
                reservedBalance: Prisma.Decimal;
                address: string | null;
                derivationIndex: number | null;
                isFrozen: boolean;
            };
        } & {
            status: string;
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            reference: string;
            fee: Prisma.Decimal;
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
        ledgerEntries: {
            amount: Prisma.Decimal;
            type: import("@src/generated/client").$Enums.LedgerType;
            balanceAfter: Prisma.Decimal;
            id: string;
            createdAt: Date;
            metadata: Prisma.JsonValue | null;
            walletId: string;
            transactionId: string | null;
            orderId: string | null;
            reference: string;
        }[];
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
                isSystem: boolean;
                status: import("@src/generated/client").$Enums.UserStatus;
                id: string;
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
            };
        } & {
            id: string;
            chain: string | null;
            updatedAt: Date;
            version: number;
            userId: string;
            currency: import("@src/generated/client").$Enums.Currency;
            balance: Prisma.Decimal;
            reservedBalance: Prisma.Decimal;
            address: string | null;
            derivationIndex: number | null;
            isFrozen: boolean;
        };
    } & {
        status: string;
        amount: Prisma.Decimal;
        type: import("@src/generated/client").$Enums.LedgerType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: Prisma.JsonValue | null;
        walletId: string;
        reference: string;
        fee: Prisma.Decimal;
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
                id: string;
                email: string | null;
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            device: string | null;
            ipAddress: string | null;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            metadata: Prisma.JsonValue | null;
            success: boolean;
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
                email: string | null;
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                } | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            device: string | null;
            ipAddress: string | null;
            actorId: string | null;
            action: string;
            resource: string | null;
            resourceId: string | null;
            oldValue: Prisma.JsonValue | null;
            newValue: Prisma.JsonValue | null;
            metadata: Prisma.JsonValue | null;
            success: boolean;
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
            amount: Prisma.Decimal;
            id: string;
            createdAt: Date;
            wallet: {
                currency: import("@src/generated/client").$Enums.Currency;
            };
            reference: string;
        }[];
    }>;
    refreshSanctions(): Promise<import("../security/crypto-risk.service").RefreshResult>;
    getWithdrawalJobs(page: number, limit: number, status?: string): Promise<{
        jobs: {
            status: string;
            amount: Prisma.Decimal;
            id: string;
            chain: string | null;
            createdAt: Date;
            updatedAt: Date;
            currency: import("@src/generated/client").$Enums.Currency;
            metadata: Prisma.JsonValue | null;
            walletId: string;
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
            evm: string;
            btc: string;
            sol: string;
            tron: string;
        };
        balances: ({
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
        } | {
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
                wallet: {
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
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
                amount: Prisma.Decimal;
                wallet: {
                    user: {
                        email: string | null;
                    };
                    currency: import("@src/generated/client").$Enums.Currency;
                };
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
