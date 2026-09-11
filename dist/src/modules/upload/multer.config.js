"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardMulterConfig = exports.multerConfig = void 0;
exports.multerConfigFor = multerConfigFor;
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const common_1 = require("@nestjs/common");
const UPLOADS_ROOT = (0, path_1.join)(__dirname, '..', '..', 'uploads');
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
const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
function multerConfigFor(subdir, allowedTypes = ALLOWED_MIME_TYPES, maxSize = MAX_FILE_SIZE) {
    const destination = (0, path_1.join)(UPLOADS_ROOT, subdir);
    return {
        storage: (0, multer_1.diskStorage)({
            destination,
            filename: (_req, file, cb) => {
                const uniqueName = `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (!allowedTypes.includes(file.mimetype)) {
                cb(new common_1.BadRequestException(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
                return;
            }
            cb(null, true);
        },
        limits: {
            fileSize: maxSize,
        },
    };
}
exports.multerConfig = multerConfigFor('disputes');
exports.cardMulterConfig = multerConfigFor('cards', ALLOWED_IMAGE_MIME_TYPES);
//# sourceMappingURL=multer.config.js.map