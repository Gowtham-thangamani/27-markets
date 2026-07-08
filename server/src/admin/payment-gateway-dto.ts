import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaymentGatewayType } from '@prisma/client';

export class CreatePaymentGatewayDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsEnum(PaymentGatewayType)
  type!: PaymentGatewayType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  maxAmount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder?: number;
}

export class UpdatePaymentGatewayDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsEnum(PaymentGatewayType)
  type?: PaymentGatewayType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  maxAmount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder?: number;
}
