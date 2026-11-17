-- Migration: cliques e conversões por UTM em TODAS as iscas
-- (analise, newsletter, perguntas, membros — mesmo projeto Supabase)
-- Rollback: drop view public.utm_resumo; drop table public.isca_conversoes; drop table public.isca_visitas;

-- Clique: alguém abriu uma isca por um link com UTM (1x por sessão, contado no navegador).
create table if not exists public.isca_visitas (
  id           uuid primary key default gen_random_uuid(),
  isca         text not null,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  created_at   timestamptz not null default now()
);
create index if not exists isca_visitas_isca_created_idx on public.isca_visitas (isca, created_at);

-- Conversão: cadastro concluído vindo de link com UTM.
create table if not exists public.isca_conversoes (
  id           uuid primary key default gen_random_uuid(),
  isca         text not null,
  email        text not null,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  created_at   timestamptz not null default now()
);
create index if not exists isca_conversoes_isca_created_idx on public.isca_conversoes (isca, created_at);

-- Só server-side (service_role ignora RLS); anon/authenticated não leem nem gravam.
alter table public.isca_visitas enable row level security;
alter table public.isca_conversoes enable row level security;

-- Resumo por isca + link: cliques, cadastros e conversão (%).
create or replace view public.utm_resumo
with (security_invoker = true) as
with cliques as (
  select isca,
         coalesce(utm_source, '')   as utm_source,
         coalesce(utm_medium, '')   as utm_medium,
         coalesce(utm_campaign, '') as utm_campaign,
         coalesce(utm_content, '')  as utm_content,
         count(*)                   as cliques,
         max(created_at)            as ultimo_clique
    from public.isca_visitas
   group by 1, 2, 3, 4, 5
),
cadastros as (
  select isca,
         coalesce(utm_source, '')   as utm_source,
         coalesce(utm_medium, '')   as utm_medium,
         coalesce(utm_campaign, '') as utm_campaign,
         coalesce(utm_content, '')  as utm_content,
         count(*)                   as cadastros
    from public.isca_conversoes
   group by 1, 2, 3, 4, 5
)
select isca, utm_source, utm_medium, utm_campaign, utm_content,
       coalesce(cliques, 0)   as cliques,
       coalesce(cadastros, 0) as cadastros,
       round(100.0 * coalesce(cadastros, 0) / nullif(cliques, 0), 1) as conversao_pct,
       ultimo_clique
  from cliques
  full join cadastros using (isca, utm_source, utm_medium, utm_campaign, utm_content)
 order by cliques desc nulls last, cadastros desc;

revoke all on public.utm_resumo from anon, authenticated;
