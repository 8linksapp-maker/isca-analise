import type { APIRoute } from 'astro';
import { ehRobo, extrairUtms, registrarVisita, utmSchema } from '../../lib/utm';

/**
 * POST /api/visita
 * Body: { utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content? }
 * Conta um clique em link com UTM. Resposta: 204 (best-effort) | 400.
 * Robôs (User-Agent) recebem 204 mas não contam.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, erro: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const parsed = utmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, erro: 'UTMs inválidas.' }, { status: 400 });
  }

  const ua = request.headers.get('user-agent');
  if (!ehRobo(ua)) await registrarVisita(extrairUtms(parsed.data), ua);
  return new Response(null, { status: 204 });
};
