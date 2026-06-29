import { generateReferralCode, REFERRAL_ALPHABET } from './referral-code';

describe('generateReferralCode', () => {
  it('returns an 8-char code from the safe alphabet', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
    expect([...code].every((c) => REFERRAL_ALPHABET.includes(c))).toBe(true);
  });

  it('excludes ambiguous characters I, L, O, U', () => {
    expect(REFERRAL_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it('is deterministic given a seeded rng', () => {
    const seq = [0, 0.5, 0.99, 0, 0.5, 0.99, 0, 0.5];
    let i = 0;
    const rand = () => seq[i++];
    expect(generateReferralCode(rand)).toBe(generateReferralCode(() => seq[(i = 0), i++]));
  });
});
