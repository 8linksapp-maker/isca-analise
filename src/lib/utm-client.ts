/**
 * UTMs no navegador: lê da URL de entrada, guarda na sessão (sobrevive a
 * reload/redirect) e conta o clique uma vez por sessão por combinação de UTMs.
 */
const UTM_CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const STORAGE = 'isca_utms';

function utmsDaUrl(): Record<string, string> {
  const utms: Record<string, string> = {};
  const params = new URLSearchParams(window.location.search);
  for (const campo of UTM_CAMPOS) {
    const v = params.get(campo)?.trim();
    if (v) utms[campo] = v.slice(0, 255);
  }
  return utms;
}

/** UTMs da visita atual: as da URL, ou as guardadas na sessão. */
export function lerUtms(): Record<string, string> {
  const daUrl = utmsDaUrl();
  try {
    if (Object.keys(daUrl).length) {
      sessionStorage.setItem(STORAGE, JSON.stringify(daUrl));
      return daUrl;
    }
    return JSON.parse(sessionStorage.getItem(STORAGE) || '{}');
  } catch {
    return daUrl;
  }
}

/** Conta o clique no link com UTM (1x por sessão por combinação de UTMs). */
export function registrarVisita(): void {
  const daUrl = utmsDaUrl();
  if (!Object.keys(daUrl).length) return;
  const chave = `isca_visita:${JSON.stringify(daUrl)}`;
  try {
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, '1');
  } catch {
    // sem sessionStorage: conta mesmo assim
  }
  fetch('/api/visita', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daUrl),
    keepalive: true,
  }).catch(() => {});
}
