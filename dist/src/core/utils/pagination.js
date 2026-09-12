"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampPagination = clampPagination;
function clampPagination(rawPage, rawLimit, opts = {}) {
    const maxLimit = opts.maxLimit ?? 100;
    const defaultPage = opts.defaultPage ?? 1;
    const defaultLimit = opts.defaultLimit ?? 20;
    const page = Math.max(1, Math.floor(Number(rawPage)) || defaultPage);
    const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(rawLimit)) || defaultLimit));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
//# sourceMappingURL=pagination.js.map