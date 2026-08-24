import { Injectable, Logger, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../core/database/prisma.service';
import { SecurityService } from '../security/security.service';
import { FraudRulesService } from '../security/fraud-rules.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@src/generated/client';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private securityService: SecurityService,
    private fraudRulesService: FraudRulesService,
    private emailService: EmailService,
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

    this.eventEmitter.emit('user.created', { userId: user.id, email: user.email });

    return this.generateTokens(user.id, user.role);
  }

  async login(dto: LoginDto, request?: any) {
    const user = dto.email
      ? await this.usersService.findOneByEmail(dto.email)
      : await this.usersService.findOneByPhone(dto.phone!);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Track failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = 5;
      const lockoutMinutes = 30;

      const updateData: any = { failedLoginAttempts: failedAttempts };

      if (failedAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
        updateData.failedLoginAttempts = 0;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Evaluate failed login burst fraud rule
      const ipAddress = request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || request?.ip || 'unknown';
      await this.fraudRulesService.evaluateFailedLoginBurst(
        user.email || '',
        ipAddress,
      ).catch(() => {});

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Extract IP and User-Agent from request
    const ipAddress = request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || request?.ip || 'unknown';
    const userAgent = request?.headers?.['user-agent'] || 'unknown';
    const parsedUA = this.securityService.parseUserAgent(userAgent);

    // Location from IP (best-effort)
    const location = await this.securityService.getLocationFromIp(ipAddress).catch(() => 'Unknown');

    // Enhanced Device Tracking
    await this.prisma.device.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId: dto.deviceId } },
      update: {
        lastLogin: new Date(),
        fingerprint: dto.fingerprint,
        userAgent,
        ipAddress,
        browser: parsedUA.browser,
        osVersion: parsedUA.osVersion,
        deviceName: parsedUA.deviceName,
        location,
        lastActivity: new Date(),
      },
      create: {
        userId: user.id,
        deviceId: dto.deviceId,
        fingerprint: dto.fingerprint,
        userAgent,
        ipAddress,
        browser: parsedUA.browser,
        osVersion: parsedUA.osVersion,
        deviceName: parsedUA.deviceName,
        location,
      },
    });

    // Evaluate fraud rules
    this.fraudRulesService.evaluateNewDeviceLogin(user.id, dto.deviceId, ipAddress).catch(() => {});
    this.fraudRulesService.evaluateMultipleAccountsSameDevice(user.id, dto.deviceId).catch(() => {});
    this.fraudRulesService.evaluateRapidWithdrawals(user.id).catch(() => {});
    this.fraudRulesService.evaluateUnusualVolume(user.id).catch(() => {});

    // hiden password from user response
    const { passwordHash, ...userWithoutPassword } = user;

    // If 2FA is enabled, return partial response with temporary token
    if (user.twoFactorEnabled) {
      const twoFactorToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa' },
        { secret: this.configService.get('JWT_SECRET'), expiresIn: '10m' },
      );
      await this.generateAndSend2faOtp(user);
      return { requiresTwoFactor: true, twoFactorToken };
    }

    const token = await this.generateTokens(user.id, user.role, userAgent, ipAddress);
    const userData = { ...token, user: userWithoutPassword }

    return userData;
  }

  async generateTokens(userId: string, role: Role, userAgent?: string, ipAddress?: string) {
    const payload = { sub: userId, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Store refresh token with session metadata
    await this.prisma.authToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string, request?: any) {
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

      const ipAddress = request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || request?.ip;
      const userAgent = request?.headers?.['user-agent'];

      // Update last activity on the old token before revoking
      await this.prisma.authToken.delete({ where: { id: tokenInDb.id } });

      return this.generateTokens(payload.sub, payload.role, userAgent, ipAddress);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.authToken.deleteMany({ where: { token: refreshToken } });
  }

  // --- 2FA (Email OTP) ---
  async generateAndSend2faOtp(user: { id: string; email?: string | null }) {
    if (!user.email) throw new BadRequestException('No email address on file for 2FA');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorOtpHash: hashedCode,
        twoFactorOtpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const innerHtml = `
      <p>Your 6-digit verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0;color:#E89E2D;">${code}</div>
      <p style="color:#666;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
    `;

    const html = this.emailService.wrapEmailHtml(innerHtml, 'Login Verification');
    await this.emailService.sendEmail(user.email, 'Your P2N Login Code', html);
  }

  async verify2faOtp(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorOtpHash || !user.twoFactorOtpExpires) {
      throw new UnauthorizedException('No verification pending');
    }
    if (user.twoFactorOtpExpires < new Date()) {
      throw new UnauthorizedException('Verification code expired. Request a new one.');
    }
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    return hashedCode === user.twoFactorOtpHash;
  }

  async clear2faOtp(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorOtpHash: null, twoFactorOtpExpires: null },
    });
  }

  async enable2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.email) throw new BadRequestException('No email address on file');
    if (user.twoFactorEnabled) throw new BadRequestException('2FA is already enabled');

    await this.generateAndSend2faOtp(user);
    return { success: true, message: 'OTP sent to your email' };
  }

  async confirmEnable2FA(userId: string, code: string) {
    const isValid = await this.verify2faOtp(userId, code);
    if (!isValid) throw new UnauthorizedException('Invalid verification code');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorOtpHash: null,
        twoFactorOtpExpires: null,
        twoFactorSecret: null, // Clear legacy TOTP secret
      },
    });

    return { success: true };
  }

  async verify2FALogin(twoFactorToken: string, code: string, request?: any) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(twoFactorToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }
    if (payload.purpose !== '2fa') {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    const isValid = await this.verify2faOtp(payload.sub, code);
    if (!isValid) throw new UnauthorizedException('Invalid verification code');

    await this.clear2faOtp(payload.sub);

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const ipAddress = request?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || request?.ip || 'unknown';
    const userAgent = request?.headers?.['user-agent'] || 'unknown';

    const { passwordHash, ...userWithoutPassword } = user;
    const tokens = await this.generateTokens(user.id, user.role, userAgent, ipAddress);
    return { ...tokens, user: userWithoutPassword };
  }

  async send2faOtp(twoFactorToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(twoFactorToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA token');
    }
    if (payload.purpose !== '2fa') {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    await this.generateAndSend2faOtp(user);
    return { success: true, message: 'OTP resent to your email' };
  }

  async disable2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.twoFactorEnabled) throw new BadRequestException('2FA is not enabled');

    // Generate and send OTP for verification before disabling
    await this.generateAndSend2faOtp(user);
    return { success: true, message: 'OTP sent to your email to confirm disabling 2FA' };
  }

  async confirmDisable2FA(userId: string, code: string) {
    const isValid = await this.verify2faOtp(userId, code);
    if (!isValid) throw new UnauthorizedException('Invalid verification code');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorOtpHash: null,
        twoFactorOtpExpires: null,
        twoFactorSecret: null,
      },
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

    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    const innerHtml = `<p>You requested a password reset for your P2N account.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#E89E2D;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a>
</p>
<p style="color:#666;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>`;

    if (!user.email) return { message: 'If an account exists with that email, a reset link has been sent.' };

    const html = this.emailService.wrapEmailHtml(innerHtml, 'Password Reset');
    await this.emailService.sendEmail(user.email, 'P2N Password Reset', html);

    return { message: 'If an account exists with that email, a reset link has been sent.' };
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

  // --- Change Password (while logged in) ---
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  }

  // --- Email Verification ---
  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.email) throw new UnauthorizedException('No email address on file');
    if (user.emailVerified) return { success: true, message: 'Email already verified' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: hashedCode,
        emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    const innerHtml = `
      <p>Your 6-digit email verification code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;margin:20px 0;color:#E89E2D;">${code}</div>
      <p style="color:#666;">This code expires in 15 minutes. If you didn't request this, please ignore this email.</p>
    `;
    const html = this.emailService.wrapEmailHtml(innerHtml, 'Email Verification');
    await this.emailService.sendEmail(user.email, 'Your P2N Email Verification Code', html);

    return { success: true };
  }

  async verifyEmail(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.emailVerified) return { success: true };

    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
      throw new UnauthorizedException('No verification pending. Request a new code.');
    }

    if (user.emailVerificationExpires < new Date()) {
      throw new UnauthorizedException('Verification code expired. Request a new one.');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (hashedToken !== user.emailVerificationToken) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { success: true };
  }

  // --- Phone Verification ---
  async sendPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.phone) throw new UnauthorizedException('No phone number on file');
    if (user.phoneVerified) return { success: true, message: 'Phone already verified' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerificationToken: hashedCode,
        phoneVerificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send via SMS service when configured
    if (this.configService.get('NODE_ENV') === 'production') {
      // TODO: Integrate SMS provider (Twilio, Termii, etc.)
      this.logger.warn('SMS not configured — phone verification code not delivered');
    }

    return {
      success: true,
      ...(this.configService.get('NODE_ENV') !== 'production' ? { code } : {}),
      message: this.configService.get('NODE_ENV') === 'production'
        ? 'Verification code sent to your phone'
        : 'Verification code returned (dev mode)',
    };
  }

  async verifyPhone(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.phoneVerified) return { success: true };

    if (!user.phoneVerificationToken || !user.phoneVerificationExpires) {
      throw new UnauthorizedException('No verification pending. Request a new code.');
    }

    if (user.phoneVerificationExpires < new Date()) {
      throw new UnauthorizedException('Verification code expired. Request a new one.');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (hashedToken !== user.phoneVerificationToken) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationToken: null,
        phoneVerificationExpires: null,
      },
    });

    return { success: true };
  }
}
