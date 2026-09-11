export declare class UploadService {
    private readonly uploadsDir;
    getUploadPath(filename: string, subdir?: string): string;
    getFileUrl(filename: string, subdir?: string): string;
}
