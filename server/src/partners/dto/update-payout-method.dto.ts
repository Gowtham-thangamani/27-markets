import { IsIn, IsObject, IsString, MaxLength } from 'class-validator';
import { PayoutMethod } from '@prisma/client';

export class UpdatePayoutMethodDto {
  @IsIn(Object.values(PayoutMethod))
  method!: PayoutMethod;

  // Free-form per method (bank: accountName/iban/swift; crypto: network/address).
  // Values are validated/normalised in the service before persisting.
  @IsObject()
  details!: Record<string, string>;
}

/** One detail field, reused if we ever validate the shape per method. */
export class PayoutDetail {
  @IsString() @MaxLength(120) value!: string;
}
