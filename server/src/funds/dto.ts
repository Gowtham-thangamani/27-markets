import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

/** Minimum deposit enforced server-side (USD). Keep in sync with the UI. */
export const MIN_DEPOSIT = 50;

/** Validates that a numeric-string (or number) amount is at least `min`. */
export function IsMinAmount(min: number, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMinAmount',
      target: object.constructor,
      propertyName,
      constraints: [min],
      options,
      validator: {
        validate(value: unknown) {
          const n =
            typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
          return Number.isFinite(n) && n >= min;
        },
        defaultMessage() {
          return `Amount must be at least ${min}`;
        },
      },
    });
  };
}

export class DepositDto {
  @IsString()
  accountId!: string;

  @IsNumberString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  @IsMinAmount(MIN_DEPOSIT)
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
  @IsMinAmount(MIN_DEPOSIT)
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
