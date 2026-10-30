import { z } from 'zod';
import { supabaseServer } from './supabase';
import { enviarEmail } from './email';
import { templateBoasVindasAnalise } from './templates';
import { getSettings } from './settings';

/**
 * WhatsApp BR: aceita qualquer DDD (nada de prender em 11).
 * Entrada pode ter máscara/símbolos; guardamos só dígitos.
 * Normaliza: remove 55 do país, exige 10 ou 11 dígitos, DDD entre 11 e 99.
 */
export const whatsappSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .transform((v) => {
    if ((v.length === 12 || v.length === 13) && v.startsWith('55')) return v.slice(2);
    return v;
  })
  .refine((v) => (v.length === 10 || v.length === 11) && Number(v.slice(0, 2)) >= 11, {
    message: 'WhatsApp inválido — informe DDD + número (10 ou 11 dígitos).',
  });

/** UTMs de origem do lead — opcionais; vazio vira undefined (não sobrescreve no upsert). */
export const UTM_CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

const utmSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => v || undefined);

export const cadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido').max(254),
  whatsapp: whatsappSchema,
  segmento: z.enum(['agencia', 'dono_de_negocio', 'freelancer'], {
    errorMap: () => ({ message: 'Escolha uma opção: Agência, Dono de Negócio ou Freelancer.' }),
  }),
  utm_source: utmSchema,
  utm_medium: utmSchema,
  utm_campaign: utmSchema,
  utm_term: utmSchema,
  utm_content: utmSchema,
});

export type CadastroInput = z.infer<typeof cadastroSchema>;

export type ResultadoCadastro =
  | { ok: true }
  | { ok: false; status: 400 | 500; erro: string };

/**
 * Grava o lead (re-cadastro substitui o cadastro antigo) e envia o
 * email de boas-vindas com o link de inscrição da aula no Zoom.
 * UTMs só entram no payload quando vieram preenchidas — re-cadastro
 * sem UTM não apaga a origem gravada antes.
 */
export async function criarLead(input: CadastroInput): Promise<ResultadoCadastro> {
  const { nome, email, whatsapp, segmento } = input;
  const admin = supabaseServer();

  const utms: Partial<Record<(typeof UTM_CAMPOS)[number], string>> = {};
  for (const campo of UTM_CAMPOS) {
    if (input[campo]) utms[campo] = input[campo];
  }

  const { error } = await admin
    .from('analise_leads')
    .upsert(
      {
        nome,
        email,
        whatsapp,
        segmento,
        ...utms,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    );

  if (error) {
    console.error('[cadastro] upsert:', error.message);
    return { ok: false, status: 500, erro: 'Não foi possível concluir o cadastro. Tente novamente. [db: ' + error.message + ']' };
  }

  // boas-vindas best-effort — falha de email não derruba o cadastro
  try {
    const settings = await getSettings();
    await enviarEmail({
      paraEmail: email,
      paraNome: nome,
      assunto: 'Sua análise gratuita está confirmada 🎯',
      html: templateBoasVindasAnalise({
        nome,
        linkAula: settings.link_aula,
      }),
    });
  } catch (err) {
    console.error('[cadastro] falha no email de boas-vindas (lead já salvo):', err);
  }

  return { ok: true };
}
