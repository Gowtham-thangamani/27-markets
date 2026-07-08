import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Partial update of a transactional template's subject/body. */
export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;
}
