import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KycStepStatus } from '@prisma/client';

export class KycAnswerItem {
  @IsString()
  fieldId!: string;

  @IsString()
  @MaxLength(1000)
  value!: string;
}

export class SaveKycAnswersDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => KycAnswerItem)
  answers!: KycAnswerItem[];
}

export class AcceptConsentsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  consentIds!: string[];
}

export const KYC_STEPS = ['identity', 'address', 'selfie'] as const;
export type KycStep = (typeof KYC_STEPS)[number];

export class ReviewKycDto {
  @IsString()
  userId!: string;

  @IsIn(KYC_STEPS)
  step!: KycStep;

  @IsEnum(KycStepStatus)
  status!: KycStepStatus;
}
