// Crockford base32 minus ambiguous I, L, O, U.
export const REFERRAL_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 8-char referral code. `rand` is injectable for deterministic tests. */
export function generateReferralCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += REFERRAL_ALPHABET[Math.floor(rand() * REFERRAL_ALPHABET.length)];
  }
  return out;
}
