export declare function multerConfigFor(subdir: string, allowedTypes?: string[], maxSize?: number): {
    storage: import("multer").StorageEngine;
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
    limits: {
        fileSize: number;
    };
};
export declare const multerConfig: {
    storage: import("multer").StorageEngine;
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
    limits: {
        fileSize: number;
    };
};
export declare const cardMulterConfig: {
    storage: import("multer").StorageEngine;
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
    limits: {
        fileSize: number;
    };
};
