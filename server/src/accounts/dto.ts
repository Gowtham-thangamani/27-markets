import { IsEnum } from 'class-validator';
import { AccountMode, AccountType } from '@prisma/client';

export class CreateAccountDto {
  @IsEnum(AccountType)
  type!: AccountType;

  @IsEnum(AccountMode)
  mode!: AccountMode;
}
