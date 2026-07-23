import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @AuditLog('AUTH_REGISTER', 'AUTH')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_LOGIN', 'AUTH')
  @ApiOperation({ summary: 'User login' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.authService.refresh(dto.refreshToken, req);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_LOGOUT', 'AUTH')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_LOGIN_GOOGLE', 'AUTH')
  @ApiOperation({ summary: 'Google login/register' })
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  generate2FA(@Req() req: any) {
    return this.authService.generate2FASecret(req.user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @AuditLog('AUTH_2FA_ENABLE', 'AUTH')
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  verify2FA(@Req() req: any, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.verifyAndEnable2FA(req.user.id, dto.token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_PASSWORD_CHANGE', 'AUTH')
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('verify-email/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification code' })
  sendEmailVerification(@Req() req: any) {
    return this.authService.sendEmailVerification(req.user.id);
  }

  @Post('verify-email/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_EMAIL_VERIFIED', 'AUTH')
  @ApiOperation({ summary: 'Verify email with code' })
  verifyEmail(@Req() req: any, @Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(req.user.id, dto.token);
  }

  @Post('verify-phone/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send phone verification code' })
  sendPhoneVerification(@Req() req: any) {
    return this.authService.sendPhoneVerification(req.user.id);
  }

  @Post('verify-phone/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_PHONE_VERIFIED', 'AUTH')
  @ApiOperation({ summary: 'Verify phone with code' })
  verifyPhone(@Req() req: any, @Body() dto: VerifyPhoneDto) {
    return this.authService.verifyPhone(req.user.id, dto.token);
  }
}
