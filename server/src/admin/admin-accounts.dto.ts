import { IsEnum, Matches } from 'class-validator';
import { AccountStatus } from '@prisma/client';

export class SetAccountStatusDto {
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}

export class SetLeverageDto {
  // Format "1:N" with a sane upper bound of 1:1000 (blocks absurd values like 1:9999).
  @Matches(/^1:([1-9]\d{0,2}|1000)$/, { message: 'leverage must look like "1:500" (max 1:1000)' })
  leverage!: string;
}
