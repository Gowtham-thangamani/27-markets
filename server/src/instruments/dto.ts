import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const INSTRUMENT_CATEGORIES = [
  'Forex',
  'Metals',
  'Indices',
  'Commodities',
  'Stocks',
  'Crypto',
] as const;

export class CreateInstrumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  symbol!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(INSTRUMENT_CATEGORIES)
  category!: (typeof INSTRUMENT_CATEGORIES)[number];

  // Provider feed symbol (e.g. "OANDA:EUR_USD"). Omit for no live feed.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  feed?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  spread?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateInstrumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  symbol?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(INSTRUMENT_CATEGORIES)
  category?: (typeof INSTRUMENT_CATEGORIES)[number];

  // Empty string clears the feed (removes the live price / tradeable flag).
  @IsOptional()
  @ValidateIf((o: UpdateInstrumentDto) => o.feed !== '')
  @IsString()
  @MaxLength(64)
  feed?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  spread?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
