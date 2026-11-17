import type { APIRoute } from 'astro';
import { getVar } from '../../../lib/runtime-env';
import { sincronizarVideos } from '../../../lib/youtube-videos';

/**
 * POST /api/cron/videos — atualiza o de-para UTM → vídeo (utm_videos).
 * Protegido: Authorization: Bearer <CRON_SECRET>.
 * Padrão: só os 100 vídeos mais recentes (cabe no limite de subrequests do CF).
 * ?todos=1 varre o canal inteiro — rodar LOCAL (centenas de chamadas à API).
 */
export const POST: APIRoute = async ({ request, url }) => {
  const auth = request.headers.get('authorization') || '';
  const cronSecret = getVar('CRON_SECRET');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, erro: 'unauthorized' }, { status: 401 });
  }

  try {
    const resultado = await sincronizarVideos(url.searchParams.get('todos') === '1' ? undefined : 100);
    return Response.json({ ok: true, ...resultado }, { status: 200 });
  } catch (err) {
    console.error('[cron/videos]', err instanceof Error ? err.message : err);
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
