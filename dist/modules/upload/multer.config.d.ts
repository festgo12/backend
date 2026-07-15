export declare const multerConfig: {
    storage: import("multer").StorageEngine;
    fileFilter: (_req: any, file: any, cb: any) => void;
    limits: {
        fileSize: number;
    };
};
