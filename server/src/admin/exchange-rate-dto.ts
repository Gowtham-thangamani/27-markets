import { IsOptional, IsString, Length, Matches } from 'class-validator';

const RATE = /^\d+(\.\d{1,8})?$/;

export class CreateExchangeRateDto {
  @IsString()
  @Length(3, 3)
  base!: string;

  @IsString()
  @Length(3, 3)
  quote!: string;

  @Matches(RATE, { message: 'rate must be a positive number' })
  rate!: string;
}

export class UpdateExchangeRateDto {
  @IsOptional()
  @Matches(RATE, { message: 'rate must be a positive number' })
  rate?: string;
}
