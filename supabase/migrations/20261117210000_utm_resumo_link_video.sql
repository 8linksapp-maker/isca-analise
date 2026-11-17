-- Migration: coluna link_video na utm_resumo
-- Quando utm_source = youtube e utm_content é um ID de vídeo do YouTube (11 caracteres),
-- monta o link do vídeo. Ex.: utm_content=AbC123xYz_- → https://www.youtube.com/watch?v=AbC123xYz_-
-- Rollback: rodar de novo a view da migration 20261117200000 (sem link_video).

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
       ultimo_clique,
       case
         when lower(utm_source) = 'youtube' and utm_content ~ '^[A-Za-z0-9_-]{11}$'
           then 'https://www.youtube.com/watch?v=' || utm_content
       end as link_video
  from cliques
  full join cadastros using (isca, utm_source, utm_medium, utm_campaign, utm_content)
 order by cliques desc nulls last, cadastros desc;

revoke all on public.utm_resumo from anon, authenticated;
