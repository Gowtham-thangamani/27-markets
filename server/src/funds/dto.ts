import { IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

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

export class WithdrawDto {
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
