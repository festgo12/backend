import { HelpCenterService } from './help-center.service';
export declare class HelpCenterController {
    private readonly helpService;
    constructor(helpService: HelpCenterService);
    getContent(): Promise<{
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
        category: string;
        sortOrder: number;
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
