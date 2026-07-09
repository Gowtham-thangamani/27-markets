import { CsrfGuard } from './csrf.guard';

const ctx = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;
const guard = () => new CsrfGuard({ get: () => 'https://app.example.com,http://localhost:5173' } as any);

describe('CsrfGuard — Origin allowlist on state-changing requests', () => {
  it('allows safe methods regardless of origin', () => {
    expect(guard().canActivate(ctx({ method: 'GET', headers: { origin: 'https://evil.com' } }))).toBe(true);
  });

  it('rejects a cross-origin POST from an origin not on the allowlist', () => {
    expect(() => guard().canActivate(ctx({ method: 'POST', headers: { origin: 'https://evil.com' } }))).toThrow(/cross-origin/i);
  });

  it('allows a POST from an allowlisted origin', () => {
    expect(guard().canActivate(ctx({ method: 'POST', headers: { origin: 'https://app.example.com' } }))).toBe(true);
  });

  it('allows a POST with no Origin (server-to-server / non-browser, e.g. Stripe webhook)', () => {
    expect(guard().canActivate(ctx({ method: 'POST', headers: {} }))).toBe(true);
  });

  it('falls back to the Referer origin when Origin is absent', () => {
    expect(() => guard().canActivate(ctx({ method: 'POST', headers: { referer: 'https://evil.com/x' } }))).toThrow(/cross-origin/i);
  });
});
