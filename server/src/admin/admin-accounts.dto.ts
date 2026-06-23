import { IsEnum, Matches } from 'class-validator';
import { AccountStatus } from '@prisma/client';

export class SetAccountStatusDto {
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}

export class SetLeverageDto {
  @Matches(/^1:\d{1,4}$/, { message: 'leverage must look like "1:500"' })
  leverage!: string;
}
