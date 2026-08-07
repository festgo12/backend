"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpCenterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/database/prisma.service");
let HelpCenterService = class HelpCenterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPublicContent() {
        const items = await this.prisma.helpContent.findMany({
            where: { active: true },
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
            select: { id: true, category: true, title: true, content: true, sortOrder: true },
        });
        const faq = items.filter(i => i.category === 'FAQ');
        const contact = items.filter(i => i.category === 'CONTACT');
        return { faq, contact };
    }
    async getAllContent() {
        return this.prisma.helpContent.findMany({
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        });
    }
    async createItem(data) {
        return this.prisma.helpContent.create({ data });
    }
    async updateItem(id, data) {
        const item = await this.prisma.helpContent.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Help content not found');
        return this.prisma.helpContent.update({ where: { id }, data });
    }
    async deleteItem(id) {
        const item = await this.prisma.helpContent.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Help content not found');
        return this.prisma.helpContent.delete({ where: { id } });
    }
};
exports.HelpCenterService = HelpCenterService;
exports.HelpCenterService = HelpCenterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HelpCenterService);
//# sourceMappingURL=help-center.service.js.map