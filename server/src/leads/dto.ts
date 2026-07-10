import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LeadSource } from '@prisma/client';

/** Public lead capture (demo request / contact form). */
export class CaptureLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  // Only the public-facing sources may be set here; REGISTER is server-only.
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
