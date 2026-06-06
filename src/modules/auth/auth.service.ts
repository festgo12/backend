import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../core/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { generateSecret, verify, generateURI } from "otplib";
import * as toDataURL from 'qrcode';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) { }

  async register(dto: RegisterDto) {
    if (dto.email) {
      const existingEmail = await this.usersService.findOneByEmail(dto.email);
      if (existingEmail) throw new ConflictException('Email already exists');
    }

    if (dto.phone) {
      const existingPhone = await this.usersService.findOneByPhone(dto.phone);
      if (existingPhone) throw new ConflictException('Phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash: hashedPassword,
        role: Role.USER,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      include: { profile: true },
    });

    return this.generateTokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = dto.email
      ? await this.usersService.findOneByEmail(dto.email)
      : await this.usersService.findOneByPhone(dto.phone!);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    // Device Tracking
    await this.prisma.device.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId: dto.deviceId } },
      update: { lastLogin: new Date(), fingerprint: dto.fingerprint },
      create: {
        userId: user.id,
        deviceId: dto.deviceId,
        fingerprint: dto.fingerprint,
      },
    });
    // hiden password from user response
    const { passwordHash, ...userWithoutPassword } = user;
    const token = await this.generateTokens(user.id, user.role)
    const userData = { ...token, user: userWithoutPassword }

    return userData;
  }

  async generateTokens(userId: string, role: Role) {
    const payload = { sub: userId, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Store refresh token
    await this.prisma.authToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const tokenInDb = await this.prisma.authToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenInDb || tokenInDb.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Revoke old refresh token (optional: rotate tokens)
      await this.prisma.authToken.delete({ where: { id: tokenInDb.id } });

      return this.generateTokens(payload.sub, payload.role);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.authToken.deleteMany({ where: { token: refreshToken } });
  }

  // --- 2FA ---
  async generate2FASecret(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new UnauthorizedException();

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      label: user.email || userId,
      issuer: 'P2N Marketplace',
      secret,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeDataURL = await toDataURL.toDataURL(otpauthUrl);
    return { secret, qrCodeDataURL };
  }

  async verifyAndEnable2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new UnauthorizedException('2FA not initialized');

    const isValid = verify({ secret: user.twoFactorSecret, token });
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true };
  }

  // --- Google Login ---
  async googleLogin(dto: GoogleLoginDto) {
    const client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.token,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedException('Invalid Google token');

      let user = await this.usersService.findOneByEmail(payload.email);

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: payload.email,
            passwordHash: '', // Social logins don't need a local password initially
            role: Role.USER,
            profile: {
              create: {
                firstName: payload.given_name || '',
                lastName: payload.family_name || '',
              },
            },
          },
          // Tell prisma to return the profile attached so the TS type matches
          include: {
            profile: true
          }

        });
      }

      // Device Tracking
      // await this.prisma.device.upsert({
      //   where: { userId_deviceId: { userId: user.id, deviceId: dto.deviceId } },
      //   update: { lastLogin: new Date(), fingerprint: dto.fingerprint },
      //   create: {
      //     userId: user.id,
      //     deviceId: dto.deviceId,
      //     fingerprint: dto.fingerprint,
      //   },
      // });

      if (!user || !user.id) {
        throw new Error('User not found or ID is missing');
        // Alternatively: return null; or handle accordingly
      }

      await this.prisma.device.upsert({
        where: {
          userId_deviceId: {
            userId: user.id, // Now safe to access
            deviceId: dto.deviceId
          }
        },
        update: {
          lastLogin: new Date(),
          fingerprint: dto.fingerprint
        },
        create: {
          userId: user.id,
          deviceId: dto.deviceId,
          fingerprint: dto.fingerprint,
        },
      });




      // return this.generateTokens(user.id, user.role);
      // hiden password from user response
      const { passwordHash, ...userWithoutPassword } = user;
      const token = await this.generateTokens(user.id, user.role)
      const userData = { ...token, user: userWithoutPassword }

      return userData;
    } catch (e) {
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  // --- Password Reset ---
  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) return; // Silent return for security

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // TODO: Send email via MailerModule (Implementation in future step)
    return { resetToken }; // Returning for now so user can test
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { success: true };
  }
}
