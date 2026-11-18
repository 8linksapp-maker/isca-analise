-- Migration: cliques de robô (verificadores de link do YouTube/Google) inflavam isca_visitas.
-- Agora o clique só conta com interação humana + filtro de User-Agent no servidor,
-- e o User-Agent fica salvo para auditoria. Zera os registros antigos (eram de robô).
-- Rollback: alter table public.isca_visitas drop column user_agent;

alter table public.isca_visitas add column if not exists user_agent text;

truncate table public.isca_visitas;
