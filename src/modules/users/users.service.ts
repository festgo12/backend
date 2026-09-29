import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
import { UploadService } from '../upload/upload.service';


@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: true,
        wallets: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, ...result } = user;

    // Legacy rows can hold an absolute dev origin (e.g.
    // "http://localhost:3000/uploads/avatars/...") — rewrite onto the
    // currently configured public origin so clients prefix the right base.
    if (result.profile?.avatarUrl) {
      result.profile = {
        ...result.profile,
        avatarUrl: this.uploadService.normalizeStoredFileUrl(
          result.profile.avatarUrl,
        ),
      };
    }

    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.profile.update({
      where: { userId },
      data: dto,
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });
  }

  async getDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastLogin: 'desc' },
    });
  }

  async removeDevice(userId: string, deviceId: string) {
    return this.prisma.device.deleteMany({
      where: {
        id: deviceId,
        userId,
      },
    });
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findOneByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      include: { profile: true },
    });
  }

  async findOneById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }
}
