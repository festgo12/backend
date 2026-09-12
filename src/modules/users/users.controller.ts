import { Controller, Get, Patch, Body, UseGuards, Delete, Param, UseInterceptors, UploadedFile, BadRequestException, OnModuleInit } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-user.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuditLog } from '../audit/audit.decorator';

/**
 * Avatar files are written to <process.cwd()>/uploads/avatars — NOT under
 * dist/, which `nest build` cleans on every rebuild (this previously broke
 * avatar URLs after each rebuild). main.ts serves /uploads from the same root.
 */
const AVATAR_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'avatars');

/** Ensure the upload directory exists so the first upload never hits ENOENT. */
function ensureAvatarDir(): void {
  mkdirSync(AVATAR_UPLOAD_ROOT, { recursive: true });
}

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  /** Belt-and-braces with the constructor check below. */
  onModuleInit() {
    ensureAvatarDir();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@GetUser('id') userId: string) {
    return this.usersService.findMe(userId);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        // Checked per-request too: the folder may be cleared while running
        // (e.g. cleanup jobs) — recreate on demand instead of crashing.
        ensureAvatarDir();
        cb(null, AVATAR_UPLOAD_ROOT);
      },
      // Unique name per upload: each re-upload produces a new URL, so client
      // image caches (Flutter NetworkImage, browsers) always fetch fresh bytes.
      filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
        cb(new BadRequestException('Invalid image type. Allowed: JPEG, PNG, GIF, WebP'), false);
        return;
      }
      cb(null, true);
    },
  }))
  @AuditLog('USER_PROFILE_UPDATE', 'USER')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      // Delete the old avatar file (best-effort) before saving the new one.
      try {
        const currentProfile = await this.usersService.findMe(userId);
        const oldAvatar = (currentProfile as { profile?: { avatarUrl?: string | null } })
          ?.profile?.avatarUrl;
        if (oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
          const oldPath = join(process.cwd(), oldAvatar);
          await unlink(oldPath).catch(() => {});
        }
      } catch (_) {}
      dto.avatarUrl = `/uploads/avatars/${file.filename}`;
    }
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  updatePreferences(@GetUser('id') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(userId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get logged in devices' })
  getDevices(@GetUser('id') userId: string) {
    return this.usersService.getDevices(userId);
  }

  @Delete('devices/:id')
  @AuditLog('SECURITY_DEVICE_REMOVE', 'DEVICE')
  @ApiOperation({ summary: 'Remove a device session' })
  removeDevice(@GetUser('id') userId: string, @Param('id') deviceId: string) {
    return this.usersService.removeDevice(userId, deviceId);
  }
}
