import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PrepareDocumentDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class GenerateDocumentDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  /** Admin-supplied values for tokens the server cannot resolve. */
  @IsOptional()
  @IsObject()
  vars?: Record<string, string>;
}
