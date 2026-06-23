import { describe, it, expect } from 'vitest';
import { mapUser, type ApiUser } from './apiMappers';

describe('mapUser', () => {
  it('carries the role through to the profile', () => {
    const api: ApiUser = {
      id: 'u1',
      email: 'a@b.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      country: null,
      role: 'AGENT',
      twoFactorEnabled: false,
      joinedAt: '2026-01-01',
    };
    const profile = mapUser(api);
    expect(profile.role).toBe('AGENT');
    expect(profile.name).toBe('Ada Lovelace');
  });
});
