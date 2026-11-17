-- Migration: de-para UTM → vídeo do YouTube (lido das descrições dos vídeos)
-- Preenchida pelo POST /api/cron/videos (YouTube Data API). Campos UTM ausentes = '' (para a PK funcionar).
-- Rollback: drop table public.utm_videos; + rodar de novo a view da migration 20261117210000.

create table if not exists public.utm_videos (
  video_id      text not null,
  titulo        text not null,
  publicado_em  timestamptz,
  link_video    text not null,
  utm_source    text not null default '',
  utm_medium    text not null default '',
  utm_campaign  text not null default '',
  utm_content   text not null default '',
  atualizado_em timestamptz not null default now(),
  primary key (video_id, utm_source, utm_medium, utm_campaign, utm_content)
);
create index if not exists utm_videos_combo_idx
  on public.utm_videos (utm_source, utm_medium, utm_campaign, utm_content);

alter table public.utm_videos enable row level security;

-- utm_resumo ganha título/data do vídeo. Se a mesma combinação de UTMs aparece
-- em mais de um vídeo, titulo_video avisa "AMBÍGUO" e link_video lista todos.
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
),
videos as (
  select utm_source, utm_medium, utm_campaign, utm_content,
         count(distinct video_id)               as videos_qtd,
         min(titulo)                            as titulo,
         min(publicado_em)                      as publicado_em,
         string_agg(distinct link_video, ' , ') as links
    from public.utm_videos
   group by 1, 2, 3, 4
),
base as (
  select isca, utm_source, utm_medium, utm_campaign, utm_content,
         coalesce(cliques, 0)   as cliques,
         coalesce(cadastros, 0) as cadastros,
         ultimo_clique
    from cliques
    full join cadastros using (isca, utm_source, utm_medium, utm_campaign, utm_content)
)
select b.isca, b.utm_source, b.utm_medium, b.utm_campaign, b.utm_content,
       b.cliques,
       b.cadastros,
       round(100.0 * b.cadastros / nullif(b.cliques, 0), 1) as conversao_pct,
       b.ultimo_clique,
       coalesce(
         v.links,
         case
           when lower(b.utm_source) = 'youtube' and b.utm_content ~ '^[A-Za-z0-9_-]{11}$'
             then 'https://www.youtube.com/watch?v=' || b.utm_content
         end
       ) as link_video,
       case
         when v.videos_qtd > 1 then 'AMBÍGUO: ' || v.videos_qtd || ' vídeos usam essas UTMs'
         else v.titulo
       end as titulo_video,
       v.publicado_em as video_publicado_em
  from base b
  left join videos v using (utm_source, utm_medium, utm_campaign, utm_content)
 order by b.cliques desc, b.cadastros desc;

revoke all on public.utm_resumo from anon, authenticated;
