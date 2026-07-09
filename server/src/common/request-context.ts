import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request context propagated through the async call chain. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Request-scoped store (AsyncLocalStorage). A middleware seeds it per request so
 * deep services — notably the audit trail — can attach the caller's IP/UA without
 * threading them through every method signature.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();
