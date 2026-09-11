import { DisputeStatus } from '@src/generated/client';
import { DisputesService } from './disputes.service';
import { UpdateDisputeStatusDto } from './dto/update-dispute-status.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AssignDisputeDto } from './dto/assign-dispute.dto';
export declare class AdminDisputesController {
    private readonly disputesService;
    constructor(disputesService: DisputesService);
    findAll(page?: string, limit?: string, status?: DisputeStatus, assigneeId?: string, startDate?: string, endDate?: string, search?: string): Promise<{
        disputes: ({
            order: ({
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
            }) | null;
            evidence: {
                id: string;
                createdAt: Date;
                disputeId: string;
                url: string;
                fileName: string;
                fileType: string;
                fileSize: number;
                uploadedById: string;
            }[];
            storeOrder: ({
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
                    id: string;
                    email: string | null;
                };
                product: {
                    brand: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        enabled: boolean;
                        providerBrandId: string;
                        brandName: string;
                        logoUrl: string | null;
                        backgroundColor: string | null;
                    } | null;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    currencyCode: string;
                    providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                    providerProductId: string;
                    productName: string;
                    brandId: string | null;
                    countryCode: string;
                    denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                    fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                    minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                    maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                    senderFee: import("@src/generated/client/runtime/library").Decimal;
                    discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                    providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                    enabled: boolean;
                    markupPercent: import("@src/generated/client/runtime/library").Decimal;
                    lastSyncedAt: Date | null;
                };
            } & {
                id: string;
                status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                quantity: number;
                userId: string;
                productId: string;
                denomination: import("@src/generated/client/runtime/library").Decimal;
                currencyCode: string;
                providerOrderId: string | null;
                providerGiftUuid: string | null;
                giftLink: string | null;
                costNgn: import("@src/generated/client/runtime/library").Decimal;
                sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                feeNgn: import("@src/generated/client/runtime/library").Decimal;
                recipientEmail: string | null;
                cardCode: string | null;
                cardPin: string | null;
                failureMessage: string | null;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
            }) | null;
            initiator: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
                id: string;
                email: string | null;
            };
            assignee: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
                id: string;
                email: string | null;
            } | null;
        } & {
            description: string | null;
            orderId: string | null;
            storeOrderId: string | null;
            subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
            reference: string | null;
            reason: string;
            id: string;
            status: import("@src/generated/client").$Enums.DisputeStatus;
            resolution: string | null;
            deadline: Date | null;
            createdAt: Date;
            updatedAt: Date;
            initiatorId: string;
            assigneeId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStats(): Promise<{
        total: number;
        last24h: number;
        byStatus: {
            status: import("@src/generated/client").$Enums.DisputeStatus;
            count: number;
        }[];
        avgResolutionHours: number;
    }>;
    findOne(id: string): Promise<{
        order: ({
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
        }) | null;
        evidence: ({
            uploadedBy: {
                profile: {
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    firstName: string | null;
                    lastName: string | null;
                    kycStatus: string;
                    avatarUrl: string | null;
                } | null;
                id: string;
                email: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            disputeId: string;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            uploadedById: string;
        })[];
        storeOrder: ({
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
            product: {
                brand: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    enabled: boolean;
                    providerBrandId: string;
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                currencyCode: string;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                providerProductId: string;
                productName: string;
                brandId: string | null;
                countryCode: string;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                enabled: boolean;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                lastSyncedAt: Date | null;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            quantity: number;
            userId: string;
            productId: string;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            giftLink: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            cardCode: string | null;
            cardPin: string | null;
            failureMessage: string | null;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        }) | null;
        initiator: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            id: string;
            email: string | null;
        };
        assignee: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        description: string | null;
        orderId: string | null;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        reference: string | null;
        reason: string;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        resolution: string | null;
        deadline: Date | null;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        assigneeId: string | null;
    }>;
    updateStatus(id: string, req: any, dto: UpdateDisputeStatusDto): Promise<{
        order: {
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
        } | null;
        evidence: {
            id: string;
            createdAt: Date;
            disputeId: string;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            uploadedById: string;
        }[];
        initiator: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            id: string;
            email: string | null;
        };
    } & {
        description: string | null;
        orderId: string | null;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        reference: string | null;
        reason: string;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        resolution: string | null;
        deadline: Date | null;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        assigneeId: string | null;
    }>;
    assign(id: string, dto: AssignDisputeDto): Promise<{
        order: {
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
        } | null;
        evidence: {
            id: string;
            createdAt: Date;
            disputeId: string;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            uploadedById: string;
        }[];
    } & {
        description: string | null;
        orderId: string | null;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        reference: string | null;
        reason: string;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        resolution: string | null;
        deadline: Date | null;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        assigneeId: string | null;
    }>;
    resolve(id: string, req: any, dto: ResolveDisputeDto): Promise<{
        order: {
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
        } | null;
        evidence: {
            id: string;
            createdAt: Date;
            disputeId: string;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            uploadedById: string;
        }[];
        storeOrder: ({
            product: {
                brand: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    enabled: boolean;
                    providerBrandId: string;
                    brandName: string;
                    logoUrl: string | null;
                    backgroundColor: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                currencyCode: string;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                providerProductId: string;
                productName: string;
                brandId: string | null;
                countryCode: string;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                enabled: boolean;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                lastSyncedAt: Date | null;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            quantity: number;
            userId: string;
            productId: string;
            denomination: import("@src/generated/client/runtime/library").Decimal;
            currencyCode: string;
            providerOrderId: string | null;
            providerGiftUuid: string | null;
            giftLink: string | null;
            costNgn: import("@src/generated/client/runtime/library").Decimal;
            sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
            feeNgn: import("@src/generated/client/runtime/library").Decimal;
            recipientEmail: string | null;
            cardCode: string | null;
            cardPin: string | null;
            failureMessage: string | null;
            providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
        }) | null;
        initiator: {
            profile: {
                id: string;
                updatedAt: Date;
                userId: string;
                firstName: string | null;
                lastName: string | null;
                kycStatus: string;
                avatarUrl: string | null;
            } | null;
            id: string;
            email: string | null;
        };
    } & {
        description: string | null;
        orderId: string | null;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        reference: string | null;
        reason: string;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        resolution: string | null;
        deadline: Date | null;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        assigneeId: string | null;
    }>;
    freezeOrder(id: string, req: any): Promise<{
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
    } | {
        id: string;
        status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        quantity: number;
        userId: string;
        productId: string;
        denomination: import("@src/generated/client/runtime/library").Decimal;
        currencyCode: string;
        providerOrderId: string | null;
        providerGiftUuid: string | null;
        giftLink: string | null;
        costNgn: import("@src/generated/client/runtime/library").Decimal;
        sellPriceNgn: import("@src/generated/client/runtime/library").Decimal;
        feeNgn: import("@src/generated/client/runtime/library").Decimal;
        recipientEmail: string | null;
        cardCode: string | null;
        cardPin: string | null;
        failureMessage: string | null;
        providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
    }>;
}
