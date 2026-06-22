import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycStepStatus } from '@prisma/client';

export const KYC_STEPS = ['identity', 'address', 'selfie'] as const;
export type KycStep = (typeof KYC_STEPS)[number];

export class SubmitKycDto {
  @IsIn(KYC_STEPS)
  step!: KycStep;

  @IsString()
  @MaxLength(200)
  fileName!: string;

  // Pointer into object storage (uploaded via a separate signed-URL flow).
  @IsString()
  @MaxLength(512)
  storageKey!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class ReviewKycDto {
  @IsString()
  userId!: string;

  @IsIn(KYC_STEPS)
  step!: KycStep;

  @IsEnum(KycStepStatus)
  status!: KycStepStatus;
}
