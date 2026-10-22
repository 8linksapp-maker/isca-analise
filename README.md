# Isca Análise — Análises Gratuitas ao Vivo

Página de captura para o evento semanal do canal **Bruno Medeiros**: toda terça às 22h
tem **análise gratuita de site ao vivo no Zoom**. O lead cadastra nome, email, WhatsApp
e escolhe seu público (**Agência / Dono de Negócio / Freelancer**) — e entra no grupo de
WhatsApp do segmento dele.

## Fluxo

1. **`/`** — formulário de captura (validação Zod no server + máscara de WhatsApp genérica, qualquer DDD)
2. **`POST /api/cadastro`** — grava o lead (re-cadastro **substitui** o antigo, `upsert` por email) e envia **email de boas-vindas** com o link da aula + o grupo certo
3. **`/obrigado?seg=<segmento>`** — mostra **só o grupo** do público que a pessoa marcou (links vêm do banco, não do código)
4. **`POST /api/cron/youtube`... não — `POST /api/cron/aula`** — lembrete semanal disparado por um Worker de cron toda **terça 21h** (Brasília): email com o link da aula pra **toda a lista**

## Stack

| Camada | Escolha |
|---|---|
| App | Astro 5 (SSR) + `@astrojs/cloudflare` |
| Deploy | Cloudflare Pages (Git integration — push = deploy) |
| Banco | Supabase (`analise_leads`, `analise_settings`) — RLS, só `service_role` |
| Email | Brevo API (boas-vindas + lembrete semanal) |
| Agendamento | Worker `isca-analise-cron` com Cron Trigger `0 0 * * 3` (UTC = terça 21h BR) |

## O que você (Bruno) precisa configurar

### 1. Links reais na tabela `analise_settings` (Supabase > Table Editor)

| key | o que colocar |
|---|---|
| `grupo_agencia` | link do grupo WhatsApp de Agências |
| `grupo_dono_de_negocio` | link do grupo de Donos de Negócio |
| `grupo_freelancer` | link do grupo de Freelancers |
| `link_aula` | link fixo do Zoom recorrente (terça 22h) |

Estão com PLACEHOLDERs — até trocar, a página de obrigado avisa que o link "aparece
assim que for publicado" em vez de mostrar um link quebrado.

### 2. Variáveis de ambiente (Cloudflare Pages > Settings > Environment variables)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `CRON_SECRET` — produção **e** novo deploy após adicionar.

### 3. Worker de cron (Criar Worker no painel, código em ~10 linhas)

```js
export default {
  async fetch() { return new Response("isca-analise-cron ativo"); },
  async scheduled(event, env, ctx) {
    const res = await fetch(`${env.APP_URL}/api/cron/aula`, {
      method: "POST",
      headers: {
        "Origin": env.APP_URL,
        "Authorization": `Bearer ${env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });
    console.log("cron ->", res.status, await res.text());
  },
};
```

Vars do Worker: `APP_URL`, `CRON_SECRET`. Trigger: `0 0 * * 3` (= terça 21h Brasília, UTC-3).

## Rodando local

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # 20/20
npm run build
```

## Estrutura

```
src/
├── pages/
│   ├── index.astro            # captura
│   ├── obrigado.astro         # grupo por segmento (SSR, noindex)
│   └── api/
│       ├── cadastro.ts        # POST público com validação
│       └── cron/aula.ts       # POST protegido por Bearer
├── lib/
│   ├── cadastro.ts            # upsert + boas-vindas (testável)
│   ├── aula.ts                # envio semanal em lotes de 50
│   ├── settings.ts            # analise_settings + mapeamento de segmento
│   ├── templates.ts           # emails dark (boas-vindas + lembrete)
│   ├── email.ts               # cliente Brevo
│   ├── runtime-env.ts         # vars do runtime Cloudflare (não import.meta.env)
│   └── supabase.ts            # service_role lazy
└── supabase/migrations/       # analise_leads + analise_settings
```

## Notas de segurança

- WhatsApp normalizado (só dígitos, DDD validado ≥ 11) — sem aceitação internacional
- `CRON_SECRET` obrigatório; sem ele o endpoint recusa 401
- Tabelas com **RLS ativado e sem policy** — anon não lê nada
- Páginas privadas: `/obrigado` com `noindex,nofollow`

Feito para **Bruno Medeiros** | Operação 8Links
