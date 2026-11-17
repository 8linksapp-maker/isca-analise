import type { APIRoute } from 'astro';
import { extrairUtms, registrarVisita, utmSchema } from '../../lib/utm';

/**
 * POST /api/visita
 * Body: { utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content? }
 * Conta um clique em link com UTM. Resposta: 204 (best-effort) | 400.
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

  await registrarVisita(extrairUtms(parsed.data));
  return new Response(null, { status: 204 });
};
