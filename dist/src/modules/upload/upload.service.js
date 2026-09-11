"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
let UploadService = class UploadService {
    uploadsDir = (0, path_1.join)(__dirname, '..', '..', 'uploads');
    getUploadPath(filename, subdir = 'disputes') {
        return (0, path_1.join)(this.uploadsDir, subdir, filename);
    }
    getFileUrl(filename, subdir = 'disputes') {
        const publicBase = (process.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
        return `${publicBase}/uploads/${subdir}/${filename}`;
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)()
], UploadService);
//# sourceMappingURL=upload.service.js.map