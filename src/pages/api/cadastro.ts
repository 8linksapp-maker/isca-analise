import type { APIRoute } from 'astro';
import { cadastroSchema, criarLead } from '../../lib/cadastro';

/**
 * POST /api/cadastro
 * Body: { nome, email, whatsapp, segmento }
 * Resposta: { ok: true } | { ok: false, erro } (400 | 500)
 * Re-cadastro substitui o cadastro antigo (upsert por email).
 */
export const POST: APIRoute = async ({ request }) => {
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
