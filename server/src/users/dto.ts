import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDataChangeRequestDto {
  @IsIn(['phone', 'address', 'city', 'postalCode'])
  field!: 'phone' | 'address' | 'city' | 'postalCode';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  requestedValue!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  // notifySecurity is intentionally not editable: security mail (new sign-in,
  // password change, 2FA on/off) always sends. Offering a switch that the send
  // path ignores would promise users an opt-out we do not honour.

  @IsOptional()
  @IsBoolean()
  notifyProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMarketing?: boolean;
}
