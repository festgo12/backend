import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class HelpCenterService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createItem(data: { category: string; title: string; content: string; sortOrder?: number; active?: boolean }) {
    return this.prisma.helpContent.create({ data });
  }

  async updateItem(id: string, data: { category?: string; title?: string; content?: string; sortOrder?: number; active?: boolean }) {
    const item = await this.prisma.helpContent.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Help content not found');
    return this.prisma.helpContent.update({ where: { id }, data });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.helpContent.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Help content not found');
    return this.prisma.helpContent.delete({ where: { id } });
  }
}
