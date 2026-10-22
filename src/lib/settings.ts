import { supabaseServer } from './supabase';

export type Segmento = 'agencia' | 'dono_de_negocio' | 'freelancer';

export const SEGMENTOS: Record<Segmento, { label: string; settingKey: string; emoji: string }> = {
  agencia: { label: 'Agência', settingKey: 'grupo_agencia', emoji: '🏢' },
  dono_de_negocio: { label: 'Dono de Negócio', settingKey: 'grupo_dono_de_negocio', emoji: '💼' },
  freelancer: { label: 'Freelancer', settingKey: 'grupo_freelancer', emoji: '🧑‍💻' },
};

export function ehSegmento(v: unknown): v is Segmento {
  return typeof v === 'string' && v in SEGMENTOS;
}

/**
 * Lê as configs editáveis (links de grupo + link da aula).
 * Retorna objeto { chave: valor } — defaults seguros se faltar linha.
 */
export async function getSettings(): Promise<Record<string, string>> {
  const admin = supabaseServer();
  const { data, error } = await admin.from('analise_settings').select('key, value');

  const defaults: Record<string, string> = {
    grupo_agencia: '',
    grupo_dono_de_negocio: '',
    grupo_freelancer: '',
    link_aula: '',
  };
  if (error || !data) {
    console.error('[settings] falha ao carregar:', error?.message);
    return defaults;
  }
  for (const row of data) defaults[row.key] = row.value;
  return defaults;
}

export function grupoDoSegmento(settings: Record<string, string>, segmento: Segmento): string {
  return settings[SEGMENTOS[segmento].settingKey] ?? '';
}
