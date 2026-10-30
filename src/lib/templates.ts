/**
 * Templates de email da Isca Análise — design dark do app
 * bg #0a0a0a · card #141414 · accent laranja #E8743B
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseHtml(params: {
  title: string;
  label: string;
  heading: string;
  paragrafo: string;
  botoes: Array<{ texto: string; url: string; destaque?: boolean }>;
  rodape?: string;
}): string {
  const blocosBotoes = params.botoes
    .filter((b) => b.url)
    .map(
      (b) => `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="background-color:${b.destaque ? '#e8743b' : '#1e1e1e'};border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
                    <a href="${escapeHtml(b.url)}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:'Space Grotesk',Inter,sans-serif;font-weight:600;font-size:15px;color:${b.destaque ? '#1a0d05' : '#f0f0f0'};text-decoration:none;">
                      ${escapeHtml(b.texto)} →
                    </a>
                  </td>
                </tr>
              </table>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="padding:0 8px 16px;">
              <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#a0a0a0;">// ${escapeHtml(params.label)}</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:40px 32px;">
              <h1 style="margin:0 0 16px;font-family:'Space Grotesk',Inter,sans-serif;font-size:26px;line-height:1.25;color:#f0f0f0;letter-spacing:-0.02em;">
                ${params.heading}
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#a0a0a0;">
                ${params.paragrafo}
              </p>${blocosBotoes}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#a0a0a0;">
                ${params.rodape ?? 'Você recebeu esse email porque se cadastrou para receber a análise gratuita de site.'}
              </p>
              <p style="margin:12px 0 0;font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;color:#a0a0a0;">
                — Bruno Medeiros
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Email de boas-vindas: entrega o link de inscrição da aula no Zoom. */
export function templateBoasVindasAnalise(params: {
  nome: string;
  linkAula: string;
}): string {
  const primeiroNome = params.nome.trim().split(/\s+/)[0];
  return baseHtml({
    title: 'Bem-vindo — sua Análise Gratuita',
    label: 'Análise gratuita ao vivo',
    heading: `Tudo certo, <span style="color:#e8743b;">${escapeHtml(primeiroNome)}</span> 🎯`,
    paragrafo: `Sua inscrição para a <strong style="color:#f0f0f0;">análise gratuita de site ao vivo</strong> está confirmada.<br><br>A aula acontece <strong style="color:#f0f0f0;">toda terça, às 22h</strong>, ao vivo no Zoom. Aqui está o seu link: clica no botão abaixo e faz a sua inscrição no Zoom — ele te manda o acesso da aula e te lembra antes de começar.<br><br>Guarda este email: o link vale para todas as terças.`,
    botoes: [{ texto: 'Fazer minha inscrição na aula (Zoom)', url: params.linkAula, destaque: true }],
  });
}

/** Lembrete semanal (terça 21h): chama pra aula de hoje. */
export function templateLembreteAula(params: {
  nome: string;
  linkAula: string;
}): string {
  const primeiroNome = params.nome.trim().split(/\s+/)[0];
  return baseHtml({
    title: 'Aula hoje às 22h — Análise ao vivo',
    label: 'Hoje tem',
    heading: `É hoje, <span style="color:#e8743b;">${escapeHtml(primeiroNome)}</span> 🔥`,
    paragrafo: `A <strong style="color:#f0f0f0;">análise gratuita de sites ao vivo</strong> começa <strong style="color:#f0f0f0;">às 22h</strong>, no Zoom. Chega junto e traz o teu site pra ser analisado. Se ainda não se inscreveu no Zoom, é por aqui:`,
    botoes: [{ texto: 'Acessar a aula das 22h (Zoom)', url: params.linkAula, destaque: true }],
    rodape: 'Você recebe este lembrete porque se cadastrou para a análise gratuita. Toda terça, 21h.',
  });
}
