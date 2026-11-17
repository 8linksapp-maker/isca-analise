/**
 * De-para UTM → vídeo: lê as descrições dos vídeos do canal (YouTube Data API v3),
 * extrai as UTMs dos links e grava em utm_videos (a view utm_resumo usa isso
 * pra mostrar título/link do vídeo de cada clique).
 */
import { supabaseServer } from './supabase';
import { getVar } from './runtime-env';

const API = 'https://www.googleapis.com/youtube/v3';
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

type Combo = Record<(typeof CAMPOS)[number], string>;

export interface VideoUtm extends Combo {
  video_id: string;
  titulo: string;
  publicado_em: string | null;
  link_video: string;
}

/** Combinações únicas de UTM dos links da descrição (campo ausente = ''). */
export function extrairUtmsDaDescricao(descricao: string): Combo[] {
  const vistos = new Map<string, Combo>();
  for (const bruto of descricao.match(/https?:\/\/[^\s)<>"]+/g) ?? []) {
    let url: URL;
    try {
      url = new URL(bruto);
    } catch {
      continue;
    }
    const combo = Object.fromEntries(
      CAMPOS.map((c) => [c, url.searchParams.get(c)?.trim() ?? '']),
    ) as Combo;
    if (!CAMPOS.some((c) => combo[c])) continue;
    vistos.set(CAMPOS.map((c) => combo[c]).join('|'), combo);
  }
  return [...vistos.values()];
}

async function yt<T>(caminho: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const res = await fetch(`${API}/${caminho}?${new URLSearchParams({ ...params, key: apiKey })}`);
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`YouTube ${caminho}: ${json.error?.message ?? res.status}`);
  return json;
}

/**
 * Vídeos do canal (mais novos primeiro) com links UTM na descrição.
 * maxVideos limita a varredura (cron: só os mais recentes);
 * sem limite varre o canal inteiro (~2 unidades de cota por 50 vídeos).
 */
export async function buscarVideosComUtm(opts: {
  apiKey: string;
  channelId: string;
  maxVideos?: number;
}): Promise<VideoUtm[]> {
  const canal = await yt<{ items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> }>(
    'channels',
    { part: 'contentDetails', id: opts.channelId },
    opts.apiKey,
  );
  const uploads = canal.items?.[0]?.contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error('canal não encontrado');

  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const pagina = await yt<{ items: Array<{ contentDetails: { videoId: string } }>; nextPageToken?: string }>(
      'playlistItems',
      { part: 'contentDetails', playlistId: uploads, maxResults: '50', ...(pageToken ? { pageToken } : {}) },
      opts.apiKey,
    );
    ids.push(...pagina.items.map((i) => i.contentDetails.videoId));
    pageToken = pagina.nextPageToken;
  } while (pageToken && (!opts.maxVideos || ids.length < opts.maxVideos));
  if (opts.maxVideos) ids.splice(opts.maxVideos);

  const linhas: VideoUtm[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const lote = await yt<{
      items: Array<{ id: string; snippet: { title: string; description?: string; publishedAt?: string } }>;
    }>('videos', { part: 'snippet', id: ids.slice(i, i + 50).join(',') }, opts.apiKey);
    for (const v of lote.items) {
      for (const combo of extrairUtmsDaDescricao(v.snippet.description ?? '')) {
        linhas.push({
          video_id: v.id,
          titulo: v.snippet.title,
          publicado_em: v.snippet.publishedAt ?? null,
          link_video: `https://www.youtube.com/watch?v=${v.id}`,
          ...combo,
        });
      }
    }
  }
  return linhas;
}

/** Busca no YouTube e grava/atualiza utm_videos. */
export async function sincronizarVideos(maxVideos?: number): Promise<{ videos: number; vinculos: number }> {
  const apiKey = getVar('YOUTUBE_API_KEY');
  const channelId = getVar('YOUTUBE_CHANNEL_ID');
  if (!apiKey || !channelId) throw new Error('YOUTUBE_API_KEY e YOUTUBE_CHANNEL_ID são obrigatórios.');

  const linhas = await buscarVideosComUtm({ apiKey, channelId, maxVideos });
  const agora = new Date().toISOString();
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabaseServer()
      .from('utm_videos')
      .upsert(
        linhas.slice(i, i + 500).map((l) => ({ ...l, atualizado_em: agora })),
        { onConflict: 'video_id,utm_source,utm_medium,utm_campaign,utm_content' },
      );
    if (error) throw new Error(`utm_videos: ${error.message}`);
  }
  return { videos: new Set(linhas.map((l) => l.video_id)).size, vinculos: linhas.length };
}
