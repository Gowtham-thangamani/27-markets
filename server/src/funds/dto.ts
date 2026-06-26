import { IsIn, IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

export class DepositDto {
  @IsString()
  accountId!: string;

  @IsNumberString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  amount!: string;

  @IsString()
  method!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class RequestDepositDto {
  @IsString()
  accountId!: string;

  @IsIn(['card', 'bank', 'crypto'])
  method!: 'card' | 'bank' | 'crypto';

  @IsOptional()
  @IsString()
  asset?: string; // BTC | ETH | USDT (crypto only)

  @IsNumberString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  amount!: string;
}

export class WithdrawDto {
  @IsString()
  accountId!: string;

  @IsNumberString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  amount!: string;

  @IsString()
  method!: string;

  // Payout destination (bank or crypto). Captured so finance pays the right place.
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsString() accountNumber?: string; // IBAN / account number
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() swift?: string;
  @IsOptional() @IsString() walletAddress?: string;
  @IsOptional() @IsString() network?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class TransferDto {
  @IsString()
  fromAccountId!: string;

  @IsString()
  toAccountId!: string;

  @IsNumberString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  amount!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
