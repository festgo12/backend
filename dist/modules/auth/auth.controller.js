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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const google_login_dto_1 = require("./dto/google-login.dto");
const confirm_enable_2fa_dto_1 = require("./dto/confirm-enable-2fa.dto");
const two_factor_login_dto_1 = require("./dto/two-factor-login.dto");
const send_two_factor_otp_dto_1 = require("./dto/send-two-factor-otp.dto");
const disable_2fa_dto_1 = require("./dto/disable-2fa.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const verify_phone_dto_1 = require("./dto/verify-phone.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const audit_decorator_1 = require("../audit/audit.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    register(dto) {
        return this.authService.register(dto);
    }
    login(dto, req) {
        return this.authService.login(dto, req);
    }
    refresh(dto, req) {
        return this.authService.refresh(dto.refreshToken, req);
    }
    logout(dto) {
        return this.authService.logout(dto.refreshToken);
    }
    googleLogin(dto) {
        return this.authService.googleLogin(dto);
    }
    enable2FA(req) {
        return this.authService.enable2FA(req.user.id);
    }
    confirmEnable2FA(req, dto) {
        return this.authService.confirmEnable2FA(req.user.id, dto.code);
    }
    verify2FALogin(dto, req) {
        return this.authService.verify2FALogin(dto.twoFactorToken, dto.code, req);
    }
    send2faOtp(dto) {
        return this.authService.send2faOtp(dto.twoFactorToken);
    }
    disable2FA(req) {
        return this.authService.disable2FA(req.user.id);
    }
    confirmDisable2FA(req, dto) {
        return this.authService.confirmDisable2FA(req.user.id, dto.code);
    }
    forgotPassword(dto) {
        return this.authService.forgotPassword(dto.email);
    }
    resetPassword(dto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }
    changePassword(req, dto) {
        return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
    }
    sendEmailVerification(req) {
        return this.authService.sendEmailVerification(req.user.id);
    }
    verifyEmail(req, dto) {
        return this.authService.verifyEmail(req.user.id, dto.token);
    }
    sendPhoneVerification(req) {
        return this.authService.sendPhoneVerification(req.user.id);
    }
    verifyPhone(req, dto) {
        return this.authService.verifyPhone(req.user.id, dto.token);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, audit_decorator_1.AuditLog)('AUTH_REGISTER', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User successfully registered' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_LOGIN', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'User login' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_LOGOUT', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Logout and revoke refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('google'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_LOGIN_GOOGLE', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Google login/register' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_login_dto_1.GoogleLoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, common_1.Post)('2fa/enable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_2FA_ENABLE', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Enable 2FA - sends OTP to email' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "enable2FA", null);
__decorate([
    (0, common_1.Post)('2fa/confirm-enable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_2FA_CONFIRM', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm 2FA enable with OTP code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, confirm_enable_2fa_dto_1.ConfirmEnableTwoFactorDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "confirmEnable2FA", null);
__decorate([
    (0, common_1.Post)('2fa/login-verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_2FA_LOGIN', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify 2FA during login' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [two_factor_login_dto_1.TwoFactorLoginDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verify2FALogin", null);
__decorate([
    (0, common_1.Post)('2fa/send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend 2FA OTP during login' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_two_factor_otp_dto_1.SendTwoFactorOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "send2faOtp", null);
__decorate([
    (0, common_1.Post)('2fa/disable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_2FA_DISABLE', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Disable 2FA - sends OTP to confirm' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "disable2FA", null);
__decorate([
    (0, common_1.Post)('2fa/confirm-disable'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_2FA_DISABLED', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm 2FA disable with OTP code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, disable_2fa_dto_1.DisableTwoFactorDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "confirmDisable2FA", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_PASSWORD_CHANGE', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password with token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_PASSWORD_CHANGE', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Change password while logged in' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('verify-email/send'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send email verification code' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendEmailVerification", null);
__decorate([
    (0, common_1.Post)('verify-email/verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_EMAIL_VERIFIED', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email with code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('verify-phone/send'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send phone verification code' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendPhoneVerification", null);
__decorate([
    (0, common_1.Post)('verify-phone/verify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, audit_decorator_1.AuditLog)('AUTH_PHONE_VERIFIED', 'AUTH'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone with code' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, verify_phone_dto_1.VerifyPhoneDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyPhone", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map