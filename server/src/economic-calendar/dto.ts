import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EconomicImpact } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  country!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsEnum(EconomicImpact)
  impact?: EconomicImpact;

  @IsDateString()
  eventAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  actual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  forecast?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  previous?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// All fields optional for PATCH (kept explicit to avoid extra mapped-types dep).
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  country?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsEnum(EconomicImpact)
  impact?: EconomicImpact;

  @IsOptional()
  @IsDateString()
  eventAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  actual?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  forecast?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  previous?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
