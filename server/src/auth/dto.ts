import {
  Equals,
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  // Strong-ish policy: 8+ chars with at least one letter and one number.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Enter a valid mobile number, e.g. +14155551234' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  // Format only — the 18+ check runs in AuthService.register() since it needs
  // "now" rather than a static rule.
  @IsISO8601({}, { message: 'Enter a valid date of birth' })
  dateOfBirth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  // Must explicitly accept the client agreement + risk disclosure.
  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms to register' })
  acceptTerms!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  ref?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  campaign?: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  newPassword!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  // Required only when the account has 2FA enabled.
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  totp?: string;

  // The 6-digit code emailed at login when LOGIN_EMAIL_OTP is on (and no TOTP).
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Email code must be 6 digits' })
  emailOtp?: string;
}

export class TotpVerifyDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  code!: string;
}

export class DisableTwoFactorDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  code!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  newPassword!: string;
}

// Switching a session's active role between CLIENT and PARTNER, for an account
// that holds both (e.g. a client who is also an approved IB).
export class RequestContextSwitchDto {
  @IsIn(['CLIENT', 'PARTNER'])
  targetRole!: 'CLIENT' | 'PARTNER';
}

export class ConfirmContextSwitchDto extends RequestContextSwitchDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code!: string;
}
