import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Partial update of an account type's trading conditions. */
export class UpdateAccountTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  spreadFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  commission?: string;

  @IsOptional()
  @Matches(/^1:\d{1,4}$/, { message: 'leverage must look like "1:100"' })
  leverage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  minDeposit?: number;

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder?: number;
}
