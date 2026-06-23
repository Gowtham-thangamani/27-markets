import { IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Positive money string, up to 2 decimals (validated again as Decimal server-side). */
const MONEY = /^\d+(\.\d{1,2})?$/;

export class RejectWithdrawalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdjustmentDto {
  @IsString()
  tradingAccountId!: string;

  @Matches(MONEY, { message: 'amount must be a positive money value' })
  amount!: string;

  /** CREDIT increases the client balance; DEBIT decreases it. */
  @IsIn(['CREDIT', 'DEBIT'])
  direction!: 'CREDIT' | 'DEBIT';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  memo!: string;
}
