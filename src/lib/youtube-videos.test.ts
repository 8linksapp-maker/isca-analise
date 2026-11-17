import { describe, it, expect, vi, afterEach } from 'vitest';
import { buscarVideosComUtm, extrairUtmsDaDescricao } from './youtube-videos';

vi.mock('./supabase', () => ({ supabaseServer: () => ({}) }));

const desc = `Links:
https://analise.brunomedeiroseo.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=seo&utm_content=tut_01
https://newsletter.brunomedeiroseo.com.br/?utm_source=youtube&utm_medium=video&utm_campaign=seo&utm_content=tut_01
https://links.brunomedeiroseo.com.br/go/whats?v=x&utm_source=youtube&utm_content=outro
https://8links.com.br/ sem utm`;

describe('extrairUtmsDaDescricao', () => {
  it('deduplica combinações iguais e ignora links sem UTM', () => {
    expect(extrairUtmsDaDescricao(desc)).toEqual([
      { utm_source: 'youtube', utm_medium: 'video', utm_campaign: 'seo', utm_content: 'tut_01' },
      { utm_source: 'youtube', utm_medium: '', utm_campaign: '', utm_content: 'outro' },
    ]);
  });

  it('descrição sem link → vazio', () => {
    expect(extrairUtmsDaDescricao('só texto')).toEqual([]);
  });
});

describe('buscarVideosComUtm', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('percorre canal → uploads → vídeos e monta as linhas', async () => {
    const respostas: Record<string, unknown> = {
      channels: { items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] },
      playlistItems: { items: [{ contentDetails: { videoId: 'abcDEF12345' } }] },
      videos: {
        items: [
          { id: 'abcDEF12345', snippet: { title: 'Vídeo X', description: desc, publishedAt: '2026-11-01T00:00:00Z' } },
        ],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: string) => {
        const caminho = new URL(u).pathname.split('/').pop()!;
        return new Response(JSON.stringify(respostas[caminho]), { status: 200 });
      }),
    );

    const linhas = await buscarVideosComUtm({ apiKey: 'k', channelId: 'c' });
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({
      video_id: 'abcDEF12345',
      titulo: 'Vídeo X',
      link_video: 'https://www.youtube.com/watch?v=abcDEF12345',
      utm_content: 'tut_01',
    });
  });

  it('erro da API vira exceção com a mensagem do YouTube', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })),
    );
    await expect(buscarVideosComUtm({ apiKey: 'k', channelId: 'c' })).rejects.toThrow('API key not valid');
  });
});
