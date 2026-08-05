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
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto, req: any): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    } | {
        requiresTwoFactor: boolean;
        twoFactorToken: string;
    }>;
    refresh(dto: RefreshTokenDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(dto: RefreshTokenDto): Promise<void>;
    googleLogin(dto: GoogleLoginDto): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    enable2FA(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmEnable2FA(req: any, dto: ConfirmEnableTwoFactorDto): Promise<{
        success: boolean;
    }>;
    verify2FALogin(dto: TwoFactorLoginDto, req: any): Promise<{
        user: {
            profile: {
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
                id: string;
                updatedAt: Date;
                userId: string;
                kycStatus: string;
            } | null;
            id: string;
            email: string | null;
            phone: string | null;
            resetToken: string | null;
            role: import("@src/generated/client").$Enums.Role;
            status: import("@src/generated/client").$Enums.UserStatus;
            twoFactorEnabled: boolean;
            twoFactorSecret: string | null;
            twoFactorOtpHash: string | null;
            twoFactorOtpExpires: Date | null;
            resetTokenExpires: Date | null;
            emailVerificationToken: string | null;
            emailVerificationExpires: Date | null;
            emailVerified: boolean;
            phoneVerificationToken: string | null;
            phoneVerificationExpires: Date | null;
            phoneVerified: boolean;
            failedLoginAttempts: number;
            lockedUntil: Date | null;
            isSystem: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    send2faOtp(dto: SendTwoFactorOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
    disable2FA(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    confirmDisable2FA(req: any, dto: DisableTwoFactorDto): Promise<{
        success: boolean;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        resetToken: string;
    } | undefined>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: boolean;
    }>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        success: boolean;
    }>;
    sendEmailVerification(req: any): Promise<{
        success: boolean;
        message: string;
        code?: undefined;
    } | {
        success: boolean;
        code: string;
        message?: undefined;
    }>;
    verifyEmail(req: any, dto: VerifyEmailDto): Promise<{
        success: boolean;
    }>;
    sendPhoneVerification(req: any): Promise<{
        success: boolean;
        message: string;
        code?: undefined;
    } | {
        success: boolean;
        code: string;
        message?: undefined;
    }>;
    verifyPhone(req: any, dto: VerifyPhoneDto): Promise<{
        success: boolean;
    }>;
}
