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
            order: {
                ad: {
                    id: string;
                    status: string;
                    createdAt: Date;
                    updatedAt: Date;
                    type: import("@src/generated/client").$Enums.AdType;
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
            id: string;
            status: import("@src/generated/client").$Enums.DisputeStatus;
            createdAt: Date;
            updatedAt: Date;
            initiatorId: string;
            description: string | null;
            orderId: string;
            reason: string;
            resolution: string | null;
            deadline: Date | null;
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
        order: {
            ad: {
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                type: import("@src/generated/client").$Enums.AdType;
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
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
                failedLoginAttempts: number;
                lockedUntil: Date | null;
                createdAt: Date;
                updatedAt: Date;
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
                email: string | null;
                phone: string | null;
                resetToken: string | null;
                passwordHash: string;
                role: import("@src/generated/client").$Enums.Role;
                status: import("@src/generated/client").$Enums.UserStatus;
                twoFactorEnabled: boolean;
                twoFactorSecret: string | null;
                resetTokenExpires: Date | null;
                emailVerificationToken: string | null;
                emailVerificationExpires: Date | null;
                emailVerified: boolean;
                phoneVerificationToken: string | null;
                phoneVerificationExpires: Date | null;
                phoneVerified: boolean;
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
            url: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            disputeId: string;
            uploadedById: string;
        })[];
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
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        description: string | null;
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    updateStatus(id: string, req: any, dto: UpdateDisputeStatusDto): Promise<{
        order: {
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
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        description: string | null;
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    assign(id: string, dto: AssignDisputeDto): Promise<{
        order: {
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
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        description: string | null;
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    resolve(id: string, req: any, dto: ResolveDisputeDto): Promise<{
        order: {
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
        id: string;
        status: import("@src/generated/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        initiatorId: string;
        description: string | null;
        orderId: string;
        reason: string;
        resolution: string | null;
        deadline: Date | null;
        assigneeId: string | null;
    }>;
    freezeOrder(id: string, req: any): Promise<{
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
}
