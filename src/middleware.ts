import { defineMiddleware } from 'astro/middleware';
import { setRuntimeEnv } from './lib/runtime-env';

/**
 * Captura o runtime env do Cloudflare em todo request antes dos endpoints.
 * Em build-time (páginas prerendered) `locals.runtime` pode não existir —
 * por isso o guard.
 */
export const onRequest = defineMiddleware((context, next) => {
  const runtime = (context.locals as Record<string, unknown>).runtime as
    | { env?: Record<string, unknown> }
    | undefined;
  if (runtime?.env) {
    setRuntimeEnv(runtime.env);
  }
  return next();
});
