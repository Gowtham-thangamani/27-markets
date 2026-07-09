import { RequestContextMiddleware } from './request-context.middleware';
import { requestContext } from './request-context';

describe('RequestContextMiddleware', () => {
  it('runs downstream within a context carrying the client IP and user-agent', () => {
    const mw = new RequestContextMiddleware();
    const req = { ip: '9.9.9.9', get: (h: string) => (h === 'user-agent' ? 'Agent/2' : undefined) } as any;
    let seen: unknown;

    mw.use(req, {} as any, () => {
      seen = requestContext.getStore();
    });

    expect(seen).toEqual({ ip: '9.9.9.9', userAgent: 'Agent/2' });
  });
});
