import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('px-2', false && 'px-4', 'py-2', null, 'px-8')).toBe('py-2 px-8');
  });
});
