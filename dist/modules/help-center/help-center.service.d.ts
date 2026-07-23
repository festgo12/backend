import { PrismaService } from '../../core/database/prisma.service';
export declare class HelpCenterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPublicContent(): Promise<{
        faq: {
            id: string;
            title: string;
            content: string;
            sortOrder: number;
            category: string;
        }[];
        contact: {
            id: string;
            title: string;
            content: string;
            sortOrder: number;
            category: string;
        }[];
    }>;
    getAllContent(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }>;
    deleteItem(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        sortOrder: number;
        category: string;
        active: boolean;
    }>;
}
