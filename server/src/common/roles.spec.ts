import { UserRole } from '@prisma/client';
import { STAFF_ROLES, isStaff, isAdmin } from './roles';

describe('role helpers', () => {
  it('STAFF_ROLES is exactly ADMIN and AGENT', () => {
    expect([...STAFF_ROLES].sort()).toEqual([UserRole.ADMIN, UserRole.AGENT].sort());
  });
  it('isStaff is true for ADMIN and AGENT', () => {
    expect(isStaff(UserRole.ADMIN)).toBe(true);
    expect(isStaff(UserRole.AGENT)).toBe(true);
  });
  it('isStaff is false for CLIENT and PARTNER', () => {
    expect(isStaff(UserRole.CLIENT)).toBe(false);
    expect(isStaff(UserRole.PARTNER)).toBe(false);
  });
  it('isAdmin is true only for ADMIN', () => {
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
    expect(isAdmin(UserRole.AGENT)).toBe(false);
  });
});
