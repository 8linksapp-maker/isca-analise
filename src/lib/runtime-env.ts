/**
 * Acesso a variáveis de ambiente compatível com Cloudflare (Pages/Workers).
 *
 * No runtime do CF, `import.meta.env` NÃO contém as vars do dashboard
 * (Vite resolve em build). As vars reais chegam via locals.runtime.env,
 * injetado pelo @astrojs/cloudflare. Ordem de leitura:
 *   1. runtime env (production no CF)
 *   2. import.meta.env (dev local / .env)
 *   3. globalThis (fallback)
 */
let _runtimeEnv: Record<string, unknown> = {};

export function setRuntimeEnv(env: Record<string, unknown> | undefined): void {
  if (env) _runtimeEnv = env;
}

export function getVar(name: string): string {
  const rt = _runtimeEnv[name];
  if (typeof rt === 'string' && rt) return rt;

  const build = (import.meta.env as Record<string, string | undefined>)[name];
  if (build) return build;

  const g = (globalThis as Record<string, unknown>)[name];
  return typeof g === 'string' ? g : '';
}
