-- Migration: UTMs no lead + troca da estratégia de grupo pelo link da aula por email
-- Rollback:
--   alter table public.analise_leads drop column utm_source, drop column utm_medium,
--     drop column utm_campaign, drop column utm_term, drop column utm_content;

-- Origem do lead (lida da URL da landing no cadastro). Re-cadastro sem UTM
-- não sobrescreve — o endpoint só manda as colunas que vieram preenchidas.
alter table public.analise_leads
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text;

-- Link de inscrição da aula no Zoom (vai no email de boas-vindas e no lembrete).
insert into public.analise_settings (key, value, updated_at) values
  ('link_aula', 'https://us06web.zoom.us/meeting/register/ngiRGmYtTQuA4DhSbB75lg', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Grupos de WhatsApp saíram da estratégia — linhas não são mais lidas pelo app.
delete from public.analise_settings
 where key in ('grupo_agencia', 'grupo_dono_de_negocio', 'grupo_freelancer');
