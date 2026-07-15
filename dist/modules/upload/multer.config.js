"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const common_1 = require("@nestjs/common");
const UPLOADS_DIR = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'disputes');
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
            const uniqueName = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(new common_1.BadRequestException(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
            return;
        }
        cb(null, true);
    },
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
};
//# sourceMappingURL=multer.config.js.map