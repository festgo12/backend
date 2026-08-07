import { HelpCenterService } from './help-center.service';
export declare class HelpCenterController {
    private readonly helpService;
    constructor(helpService: HelpCenterService);
    getContent(): Promise<{
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
    createItem(body: {
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
    updateItem(id: string, body: {
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
