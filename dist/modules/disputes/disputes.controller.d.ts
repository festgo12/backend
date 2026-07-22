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
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    findAll(req: any): Promise<({
        order: {
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
        };
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
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    })[]>;
    findOne(id: string, req: any): Promise<{
        order: {
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
        };
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
        orderId: string;
        reason: string;
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
