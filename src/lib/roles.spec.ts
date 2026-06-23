import { describe, it, expect } from 'vitest';
import { isStaffRole } from './roles';

describe('isStaffRole', () => {
  it('is true for ADMIN and AGENT', () => {
    expect(isStaffRole('ADMIN')).toBe(true);
    expect(isStaffRole('AGENT')).toBe(true);
  });
  it('is false for CLIENT and PARTNER', () => {
    expect(isStaffRole('CLIENT')).toBe(false);
    expect(isStaffRole('PARTNER')).toBe(false);
  });
});
