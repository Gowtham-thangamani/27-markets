import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

const httpCtx = (req: any = { method: 'GET', url: '/api/x', user: { id: 'u1' } }, res: any = { statusCode: 200 }) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as any;

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();

  it('passes the response stream through for http requests', (done) => {
    const next = { handle: () => of('ok') };
    interceptor.intercept(httpCtx(), next as any).subscribe((v) => {
      expect(v).toBe('ok');
      done();
    });
  });

  it('skips health checks but still handles the request', () => {
    const next = { handle: jest.fn(() => of('ok')) };
    interceptor.intercept(httpCtx({ method: 'GET', url: '/api/health' }), next as any);
    expect(next.handle).toHaveBeenCalled();
  });

  it('is a no-op for non-http contexts', () => {
    const next = { handle: jest.fn(() => of('x')) };
    interceptor.intercept({ getType: () => 'ws' } as any, next as any);
    expect(next.handle).toHaveBeenCalled();
  });
});
