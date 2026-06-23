import { IsEnum, IsIn, IsString } from 'class-validator';
import { KycStepStatus } from '@prisma/client';

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
