import type { APIRoute } from 'astro';
import { getVar } from '../../../lib/runtime-env';
import { enviarLembreteAula } from '../../../lib/aula';

/**
 * POST /api/cron/aula — lembrete semanal (terça 21h).
 * Protegido: Authorization: Bearer <CRON_SECRET>.
 * Chamado pelo Worker de cron toda terça.
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization') || '';
  const cronSecret = getVar('CRON_SECRET');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, erro: 'unauthorized' }, { status: 401 });
  }

  try {
    const resultado = await enviarLembreteAula();
    return Response.json({ ok: true, ...resultado }, { status: 200 });
  } catch (err) {
    console.error('[cron/aula]', err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, erro: err instanceof Error ? err.message : 'erro interno' },
      { status: 500 },
    );
  }
};

export const GET: APIRoute = () =>
  Response.json(
    { ok: false, metodo: 'use POST com Authorization: Bearer <CRON_SECRET>' },
    { status: 405 },
  );
