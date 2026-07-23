import { HelpCenterService } from './help-center.service';
export declare class HelpCenterController {
    private readonly helpService;
    constructor(helpService: HelpCenterService);
    getContent(): Promise<{
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
    createItem(body: {
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
    updateItem(id: string, body: {
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
