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

  @IsOptional()
  @IsBoolean()
  notifySecurity?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMarketing?: boolean;
}
