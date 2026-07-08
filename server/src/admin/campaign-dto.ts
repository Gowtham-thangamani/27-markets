import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  channel?: 'EMAIL' | 'SMS' | 'PUSH';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'SENT'])
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT';
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  channel?: 'EMAIL' | 'SMS' | 'PUSH';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED', 'SENT'])
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT';
}
