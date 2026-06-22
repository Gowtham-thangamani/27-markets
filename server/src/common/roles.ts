import { UserRole } from '@prisma/client';

/** The roles that may access the CRM back-office. */
export const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.AGENT];

/** True if the role may access the CRM (Admin or Agent). */
export const isStaff = (role: UserRole): boolean => STAFF_ROLES.includes(role);

/** True only for full administrators (finance approvals, role/staff mgmt, settings). */
export const isAdmin = (role: UserRole): boolean => role === UserRole.ADMIN;
