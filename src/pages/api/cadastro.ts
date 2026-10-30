import type { APIRoute } from 'astro';
import { cadastroSchema, criarLead } from '../../lib/cadastro';
import { COOKIE_LEAD } from '../../lib/settings';

/**
 * POST /api/cadastro
 * Body: { nome, email, whatsapp, segmento, utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content? }
 * Resposta: { ok: true } | { ok: false, erro } (400 | 500)
 * Re-cadastro substitui o cadastro antigo (upsert por email).
 * Sucesso grava o cookie COOKIE_LEAD — é ele que libera o /obrigado (e a oferta).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, erro: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const parsed = cadastroSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const resultado = await criarLead(parsed.data);
    if (resultado.ok) {
      cookies.set(COOKIE_LEAD, '1', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return Response.json(
      resultado.ok ? { ok: true } : { ok: false, erro: resultado.erro },
      { status: resultado.ok ? 200 : resultado.status },
    );
  } catch (err) {
    console.error('[cadastro] erro interno:', err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, erro: 'Erro interno. Tente novamente em instantes.' },
      { status: 500 },
    );
  }
};
