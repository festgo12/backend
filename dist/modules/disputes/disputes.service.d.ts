import { PrismaService } from '../../core/database/prisma.service';
import { UploadService } from '../upload/upload.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { DisputeStatus } from '@src/generated/client';
export declare class DisputesService {
    private prisma;
    private uploadService;
    private eventEmitter;
    constructor(prisma: PrismaService, uploadService: UploadService, eventEmitter: EventEmitter2);
    createDispute(userId: string, dto: CreateDisputeDto): Promise<{
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
    getUserDisputes(userId: string): Promise<({
        order: {
            ad: {
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
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
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    getDispute(disputeId: string, userId: string): Promise<{
        order: {
            ad: {
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
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
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    addEvidence(disputeId: string, userId: string, file: Express.Multer.File): Promise<{
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
    listEvidence(disputeId: string, userId: string): Promise<({
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
    listAllDisputes(filters?: {
        status?: DisputeStatus;
        assigneeId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }, page?: number, limit?: number): Promise<{
        disputes: ({
            order: {
                ad: {
                    type: import("@src/generated/client").$Enums.AdType;
                    id: string;
                    status: string;
                    createdAt: Date;
                    updatedAt: Date;
                    version: number;
                    sellerId: string;
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
                version: number;
                expiresAt: Date;
                fraudFlagged: boolean;
                sellerId: string;
                buyerId: string;
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getDisputeAdmin(disputeId: string): Promise<{
        order: {
            ad: {
                type: import("@src/generated/client").$Enums.AdType;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                version: number;
                sellerId: string;
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
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    updateDisputeStatus(disputeId: string, newStatus: DisputeStatus, adminId: string, reason?: string): Promise<{
        order: {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    assignDispute(disputeId: string, assigneeId: string): Promise<{
        order: {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    }>;
    resolveDispute(disputeId: string, resolution: string, outcome: DisputeStatus, resolvedBy: string): Promise<{
        order: {
            id: string;
            status: import("@src/generated/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            version: number;
            expiresAt: Date;
            fraudFlagged: boolean;
            sellerId: string;
            buyerId: string;
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
    freezeOrder(disputeId: string, adminId: string): Promise<{
        id: string;
        status: import("@src/generated/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        version: number;
        expiresAt: Date;
        fraudFlagged: boolean;
        sellerId: string;
        buyerId: string;
        fiatAmount: import("@src/generated/client/runtime/library").Decimal;
        cryptoAmount: import("@src/generated/client/runtime/library").Decimal;
        feeAmount: import("@src/generated/client/runtime/library").Decimal;
        adId: string;
    }>;
    getDisputeStats(): Promise<{
        total: number;
        last24h: number;
        byStatus: {
            status: import("@src/generated/client").$Enums.DisputeStatus;
            count: number;
        }[];
        avgResolutionHours: number;
    }>;
}
