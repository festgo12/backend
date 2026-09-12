import { PrismaService } from '../../core/database/prisma.service';
export declare class HelpCenterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPublicContent(): Promise<{
        faq: {
            title: string;
            id: string;
            content: string;
            category: string;
            sortOrder: number;
        }[];
        contact: {
            title: string;
            id: string;
            content: string;
            category: string;
            sortOrder: number;
        }[];
    }>;
    getAllContent(): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        category: string;
        sortOrder: number;
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
        category: string;
        sortOrder: number;
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
        category: string;
        sortOrder: number;
        active: boolean;
    }>;
    deleteItem(id: string): Promise<{
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        category: string;
        sortOrder: number;
        active: boolean;
    }>;
}
