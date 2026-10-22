import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getVar } from './runtime-env';

/**
 * Cliente Supabase server-side (service_role).
 * NUNCA expor ao client — a service key ignora RLS.
 * Instanciado de forma lazy: a validação dos endpoints roda ANTES
 * de tocar o Supabase (bugfix QA 2026-10-20).
 */
let _cliente: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (!_cliente) {
    const url = getVar('SUPABASE_URL');
    const serviceKey = getVar('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      throw new Error(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (server-side).',
      );
    }
    _cliente = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _cliente;
}
