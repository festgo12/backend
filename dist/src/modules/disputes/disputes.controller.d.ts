import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
export declare class DisputesController {
    private readonly disputesService;
    constructor(disputesService: DisputesService);
    create(req: any, dto: CreateDisputeDto): Promise<{
        description: string | null;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        orderId: string | null;
        reference: string | null;
        reason: string;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    findAll(req: any): Promise<({
        order: ({
            ad: {
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                sellerId: string;
                version: number;
                chain: string | null;
                asset: import("@src/generated/client").$Enums.Currency;
                quantity: import("@src/generated/client/runtime/library").Decimal;
                price: import("@src/generated/client/runtime/library").Decimal;
                minLimit: import("@src/generated/client/runtime/library").Decimal;
                maxLimit: import("@src/generated/client/runtime/library").Decimal;
                isSponsored: boolean;
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
            chain: string | null;
            fiatAmount: import("@src/generated/client/runtime/library").Decimal;
            cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            adId: string;
        }) | null;
        evidence: {
            id: string;
            createdAt: Date;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            disputeId: string;
            uploadedById: string;
        }[];
    } & {
        description: string | null;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        orderId: string | null;
        reference: string | null;
        reason: string;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    })[]>;
    findOne(id: string, req: any): Promise<{
        order: ({
            ad: {
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                sellerId: string;
                version: number;
                chain: string | null;
                asset: import("@src/generated/client").$Enums.Currency;
                quantity: import("@src/generated/client/runtime/library").Decimal;
                price: import("@src/generated/client/runtime/library").Decimal;
                minLimit: import("@src/generated/client/runtime/library").Decimal;
                maxLimit: import("@src/generated/client/runtime/library").Decimal;
                isSponsored: boolean;
            };
            buyer: {
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
            chain: string | null;
            fiatAmount: import("@src/generated/client/runtime/library").Decimal;
            cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
            feeAmount: import("@src/generated/client/runtime/library").Decimal;
            adId: string;
        }) | null;
        evidence: ({
            uploadedBy: {
                profile: {
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                    id: string;
                    updatedAt: Date;
                    userId: string;
                    kycStatus: string;
                } | null;
                id: string;
                email: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            disputeId: string;
            uploadedById: string;
        })[];
        storeOrder: ({
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
                enabled: boolean;
                currencyCode: string;
                providerResponse: import("@src/generated/client/runtime/library").JsonValue | null;
                denominationType: import("@src/generated/client").$Enums.GiftCardDenominationType;
                markupPercent: import("@src/generated/client/runtime/library").Decimal;
                providerProductId: string;
                productName: string;
                brandId: string | null;
                countryCode: string;
                fixedDenominations: import("@src/generated/client/runtime/library").JsonValue | null;
                minDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                maxDenomination: import("@src/generated/client/runtime/library").Decimal | null;
                senderFee: import("@src/generated/client/runtime/library").Decimal;
                discountPercentage: import("@src/generated/client/runtime/library").Decimal;
                providerPriceNgn: import("@src/generated/client/runtime/library").Decimal;
                lastSyncedAt: Date | null;
            };
        } & {
            id: string;
            status: import("@src/generated/client").$Enums.GiftCardStoreOrderStatus;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            version: number;
            quantity: number;
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
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
        };
        assignee: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        description: string | null;
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        orderId: string | null;
        reference: string | null;
        reason: string;
        storeOrderId: string | null;
        subjectType: import("@src/generated/client").$Enums.DisputeSubjectType;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    uploadEvidence(id: string, req: any, file: Express.Multer.File): Promise<{
        uploadedBy: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        disputeId: string;
        uploadedById: string;
    }>;
    listEvidence(id: string, req: any): Promise<({
        uploadedBy: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        disputeId: string;
        uploadedById: string;
    })[]>;
}
