/**
 * UTMs das iscas (server-side): validação + registro de cliques e conversões.
 * Tabelas compartilhadas entre as iscas: isca_visitas e isca_conversoes
 * (view utm_resumo cruza as duas). Registro é best-effort — se falhar,
 * só loga; nunca derruba o cadastro.
 */
import { z } from 'zod';
import { supabaseServer } from './supabase';

/** Identificador desta isca nas tabelas compartilhadas. */
export const ISCA = 'analise';

export const UTM_CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
export type UtmCampo = (typeof UTM_CAMPOS)[number];
export type Utms = Partial<Record<UtmCampo, string>>;

const utmCampo = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => v || undefined);

/** Campos utm_* opcionais — espalhe no z.object do payload de cadastro. */
export const utmShape = {
  utm_source: utmCampo,
  utm_medium: utmCampo,
  utm_campaign: utmCampo,
  utm_term: utmCampo,
  utm_content: utmCampo,
};

export const utmSchema = z.object(utmShape);

/** Só as UTMs preenchidas (vazias ficam de fora). */
export function extrairUtms(input: Partial<Record<UtmCampo, string | undefined>>): Utms {
  const utms: Utms = {};
  for (const campo of UTM_CAMPOS) {
    if (input[campo]) utms[campo] = input[campo];
  }
  return utms;
}

function temUtm(utms: Utms): boolean {
  return Object.keys(utms).length > 0;
}

/** Clique: alguém abriu a isca por um link com UTM. */
export async function registrarVisita(utms: Utms): Promise<void> {
  if (!temUtm(utms)) return;
  try {
    const { error } = await supabaseServer().from('isca_visitas').insert({ isca: ISCA, ...utms });
    if (error) console.error('[utm] visita:', error.message);
  } catch (err) {
    console.error('[utm] visita:', err instanceof Error ? err.message : err);
  }
}

/** Conversão: cadastro concluído vindo de um link com UTM. */
export async function registrarConversao(email: string, utms: Utms): Promise<void> {
  if (!temUtm(utms)) return;
  try {
    const { error } = await supabaseServer()
      .from('isca_conversoes')
      .insert({ isca: ISCA, email, ...utms });
    if (error) console.error('[utm] conversao:', error.message);
  } catch (err) {
    console.error('[utm] conversao:', err instanceof Error ? err.message : err);
  }
}
