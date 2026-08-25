export declare function clampPagination(rawPage?: string | number, rawLimit?: string | number, opts?: {
    maxLimit?: number;
    defaultPage?: number;
    defaultLimit?: number;
}): {
    page: number;
    limit: number;
    skip: number;
};
