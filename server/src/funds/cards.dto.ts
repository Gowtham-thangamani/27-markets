import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * PCI note: we accept ONLY non-sensitive display metadata here (brand, last-4,
 * expiry) — never the full PAN or CVV. In production the card is tokenized by
 * Stripe Elements client-side and this is populated from the token.
 */
export class AddCardDto {
  @IsString()
  @Matches(/^(visa|mastercard|amex|discover)$/i, { message: 'Unsupported card brand' })
  brand!: string;

  @Matches(/^\d{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expMonth!: number;

  @IsInt()
  @Min(2024)
  @Max(2099)
  expYear!: number;
}

export class CardDepositDto {
  @IsString()
  accountId!: string;

  @IsString()
  @Matches(AMOUNT, { message: 'Amount must be a positive value with up to 2 decimals' })
  amount!: string;
}
