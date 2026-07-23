import { PrismaService } from '../../core/database/prisma.service';
export declare class HelpCenterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPublicContent(): Promise<{
        faq: {
            title: string;
            id: string;
            content: string;
            sortOrder: number;
            category: string;
        }[];
        contact: {
            title: string;
            id: string;
            content: string;
            sortOrder: number;
            category: string;
        }[];
    }>;
    getAllContent(): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }[]>;
    createItem(data: {
        category: string;
        title: string;
        content: string;
        sortOrder?: number;
        active?: boolean;
    }): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }>;
    updateItem(id: string, data: {
        category?: string;
        title?: string;
        content?: string;
        sortOrder?: number;
        active?: boolean;
    }): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }>;
    deleteItem(id: string): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }>;
}
