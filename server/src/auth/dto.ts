import {
  IsEmail,
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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
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
}

export class TotpVerifyDto {
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
