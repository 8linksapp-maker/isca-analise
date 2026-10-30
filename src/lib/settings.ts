import { supabaseServer } from './supabase';

export type Segmento = 'agencia' | 'dono_de_negocio' | 'freelancer';

export const SEGMENTOS: Record<Segmento, { label: string; emoji: string }> = {
  agencia: { label: 'Agência', emoji: '🏢' },
  dono_de_negocio: { label: 'Dono de Negócio', emoji: '💼' },
  freelancer: { label: 'Freelancer', emoji: '🧑‍💻' },
};

/** Cookie gravado no cadastro com sucesso — só quem tem ele vê o /obrigado (e a oferta). */
export const COOKIE_LEAD = 'analise_lead';

/** Oferta exclusiva pós-cadastro (8links). */
export const OFERTA_8LINKS = {
  // UTMs fixas identificam a origem da venda; o /obrigado acrescenta utm_content com a origem do lead.
  url: 'https://pay.kiwify.com.br/D7o0Q7Y?utm_source=isca-analise&utm_medium=pagina-obrigado&utm_campaign=oferta-8links-97',
  precoDe: 'R$ 147',
  precoPor: 'R$ 97',
};

export function ehSegmento(v: unknown): v is Segmento {
  return typeof v === 'string' && v in SEGMENTOS;
}

/**
 * Lê as configs editáveis (hoje: link_aula = inscrição da aula no Zoom).
 * Retorna objeto { chave: valor } — defaults seguros se faltar linha.
 */
export async function getSettings(): Promise<Record<string, string>> {
  const admin = supabaseServer();
  const { data, error } = await admin.from('analise_settings').select('key, value');

  const defaults: Record<string, string> = {
    link_aula: '',
  };
  if (error || !data) {
    console.error('[settings] falha ao carregar:', error?.message);
    return defaults;
  }
  for (const row of data) defaults[row.key] = row.value;
  return defaults;
}
