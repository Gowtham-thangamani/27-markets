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

  it('maps the rng deterministically onto the alphabet', () => {
    // rng always 0 → index 0 → '0' eight times
    expect(generateReferralCode(() => 0)).toBe('00000000');
    // a constant rng produces the same code on every call (deterministic)
    const rng = () => 0.5;
    expect(generateReferralCode(rng)).toBe(generateReferralCode(rng));
  });
});
