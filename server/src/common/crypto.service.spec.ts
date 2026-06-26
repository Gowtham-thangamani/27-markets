import { CryptoService } from './crypto.service';

const cfg = (key?: string) => ({ get: () => key }) as any;
const KEY = 'a-strong-encryption-key-1234567890';

describe('CryptoService', () => {
  it('round-trips ciphertext when a key is set', () => {
    const c = new CryptoService(cfg(KEY));
    expect(c.enabled).toBe(true);
    const enc = c.encrypt('TOTPSECRET123');
    expect(enc).not.toBe('TOTPSECRET123');
    expect(enc.startsWith('v1.')).toBe(true);
    expect(c.decrypt(enc)).toBe('TOTPSECRET123');
  });

  it('is a no-op without a key (dev)', () => {
    const c = new CryptoService(cfg(undefined));
    expect(c.enabled).toBe(false);
    expect(c.encrypt('x')).toBe('x');
    expect(c.decrypt('x')).toBe('x');
  });

  it('passes through legacy plaintext on decrypt', () => {
    const c = new CryptoService(cfg(KEY));
    expect(c.decrypt('legacy-plaintext')).toBe('legacy-plaintext');
  });

  it('rejects tampered ciphertext (auth tag)', () => {
    const c = new CryptoService(cfg(KEY));
    const [v, iv, tag] = c.encrypt('secret').split('.');
    const tampered = [v, iv, tag, Buffer.from('garbage').toString('base64')].join('.');
    expect(() => c.decrypt(tampered)).toThrow();
  });
});
