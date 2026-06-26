import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Logs one line per HTTP request: method, path, status, duration, and user id.
 * Deliberately never logs bodies, query strings, headers, or cookies — those can
 * carry PII or secrets. Health checks are skipped to keep logs readable.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const path: string = (req.route?.path ?? req.url ?? '').split('?')[0];
    if (path.includes('/health')) return next.handle();

    const start = Date.now();
    const method: string = req.method;
    const userId: string = req.user?.id ?? '-';

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.logger.log(`${method} ${path} ${res.statusCode} ${Date.now() - start}ms user=${userId}`);
        },
        error: (err) => {
          const status = err?.status ?? 500;
          this.logger.warn(`${method} ${path} ${status} ${Date.now() - start}ms user=${userId} err=${err?.name ?? 'Error'}`);
        },
      }),
    );
  }
}
