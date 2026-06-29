import { describe, it, expect } from 'vitest';
import { relativeTime } from './format';

describe('relativeTime', () => {
  it('gives compact relative strings', () => {
    const now = new Date('2026-03-05T12:00:00Z');
    expect(relativeTime('2026-03-05T11:58:30Z', now)).toBe('just now');
    expect(relativeTime('2026-03-05T11:00:00Z', now)).toBe('1h ago');
    expect(relativeTime('2026-03-03T12:00:00Z', now)).toBe('2d ago');
  });
});
