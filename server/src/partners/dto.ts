import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyPartnerDto {
  @IsString() @MinLength(2) @MaxLength(60) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(2000) audience?: string;
}
