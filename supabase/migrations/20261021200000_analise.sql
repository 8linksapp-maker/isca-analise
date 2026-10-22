-- Migration: analise_leads + analise_settings (Isca 1 — Análise Gratuita ao Vivo)
-- Rollback: drop table public.analise_leads; drop table public.analise_settings;

create table if not exists public.analise_leads (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text not null unique,
  whatsapp   text not null,          -- só dígitos (DDD + número)
  segmento   text not null check (segmento in ('agencia','dono_de_negocio','freelancer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Re-cadastro substitui o antigo: ON CONFLICT(email) DO UPDATE é feito no
-- endpoint via service_role. Sem select pra anon (nenhum dado vaza).
alter table public.analise_leads enable row level security;

-- Configurações editáveis sem redeploy: links dos 3 grupos + link da aula.
create table if not exists public.analise_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.analise_settings enable row level security;

-- Placeholders — TROQUE no Supabase quando existirem os links reais.
insert into public.analise_settings (key, value) values
  ('grupo_agencia',        'https://chat.whatsapp.com/PLACEHOLDER-AGENCIA'),
  ('grupo_dono_de_negocio','https://chat.whatsapp.com/PLACEHOLDER-DONO'),
  ('grupo_freelancer',     'https://chat.whatsapp.com/PLACEHOLDER-FREELANCER'),
  ('link_aula',            'https://zoom.us/j/99999999999?pwd=analise-placeholder')
on conflict (key) do nothing;
