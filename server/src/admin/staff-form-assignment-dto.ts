import { IsString } from 'class-validator';

export class CreateStaffFormAssignmentDto {
  @IsString()
  kycFormId!: string;

  @IsString()
  staffId!: string;
}
