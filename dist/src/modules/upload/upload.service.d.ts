export declare class UploadService {
    private readonly uploadsDir;
    getUploadPath(filename: string, subdir?: string): string;
    getFileUrl(filename: string, subdir?: string): string;
    normalizeStoredFileUrl(url: string | null | undefined): string;
    toRelativeStoredUrl(url: string | null | undefined): string;
}
