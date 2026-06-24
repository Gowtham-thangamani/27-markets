import { IsIn } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SetRoleDto {
  @IsIn([UserRole.ADMIN, UserRole.AGENT])
  role!: UserRole;
}
