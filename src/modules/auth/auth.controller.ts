import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ConfirmEnableTwoFactorDto } from './dto/confirm-enable-2fa.dto';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto';
import { SendTwoFactorOtpDto } from './dto/send-two-factor-otp.dto';
import { DisableTwoFactorDto } from './dto/disable-2fa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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

  // --- 2FA (Email OTP) ---

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_2FA_ENABLE', 'AUTH')
  @ApiOperation({ summary: 'Enable 2FA - sends OTP to email' })
  enable2FA(@Req() req: any) {
    return this.authService.enable2FA(req.user.id);
  }

  @Post('2fa/confirm-enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_2FA_CONFIRM', 'AUTH')
  @ApiOperation({ summary: 'Confirm 2FA enable with OTP code' })
  confirmEnable2FA(@Req() req: any, @Body() dto: ConfirmEnableTwoFactorDto) {
    return this.authService.confirmEnable2FA(req.user.id, dto.code);
  }

  @Post('2fa/login-verify')
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_2FA_LOGIN', 'AUTH')
  @ApiOperation({ summary: 'Verify 2FA during login' })
  verify2FALogin(@Body() dto: TwoFactorLoginDto, @Req() req: any) {
    return this.authService.verify2FALogin(dto.twoFactorToken, dto.code, req);
  }

  @Post('2fa/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend 2FA OTP during login' })
  send2faOtp(@Body() dto: SendTwoFactorOtpDto) {
    return this.authService.send2faOtp(dto.twoFactorToken);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_2FA_DISABLE', 'AUTH')
  @ApiOperation({ summary: 'Disable 2FA - sends OTP to confirm' })
  disable2FA(@Req() req: any) {
    return this.authService.disable2FA(req.user.id);
  }

  @Post('2fa/confirm-disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_2FA_DISABLED', 'AUTH')
  @ApiOperation({ summary: 'Confirm 2FA disable with OTP code' })
  confirmDisable2FA(@Req() req: any, @Body() dto: DisableTwoFactorDto) {
    return this.authService.confirmDisable2FA(req.user.id, dto.code);
  }

  // --- Password ---

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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @AuditLog('AUTH_PASSWORD_CHANGE', 'AUTH')
  @ApiOperation({ summary: 'Change password while logged in' })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  // --- Verification ---

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
