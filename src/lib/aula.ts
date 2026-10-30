import { supabaseServer } from './supabase';
import { enviarEmail } from './email';
import { templateLembreteAula } from './templates';
import { getSettings } from './settings';

export interface ResultadoLembrete {
  total: number;
  enviados: number;
  falhas: number;
}

/**
 * Lembrete semanal (terça 21h): envia para TODOS os leads, pra sempre.
 * Lote de 50 em paralelo, um email por lead (com o link de inscrição da aula no Zoom).
 */
export async function enviarLembreteAula(): Promise<ResultadoLembrete> {
  const admin = supabaseServer();
  const settings = await getSettings();

  const { data: leads, error } = await admin
    .from('analise_leads')
    .select('nome, email')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`leads: ${error.message}`);
  if (!leads || leads.length === 0) return { total: 0, enviados: 0, falhas: 0 };

  let enviados = 0;
  let falhas = 0;
  const lote = 50;

  for (let i = 0; i < leads.length; i += lote) {
    const bloco = leads.slice(i, i + lote);
    const resultados = await Promise.allSettled(
      bloco.map((lead) =>
        enviarEmail({
          paraEmail: lead.email,
          paraNome: lead.nome,
          assunto: 'Aula HOJE às 22h — análise ao vivo 🔥',
          html: templateLembreteAula({
            nome: lead.nome,
            linkAula: settings.link_aula,
          }),
        }),
      ),
    );
    for (const r of resultados) {
      if (r.status === 'fulfilled' && r.value) enviados++;
      else falhas++;
    }
  }

  return { total: leads.length, enviados, falhas };
}
