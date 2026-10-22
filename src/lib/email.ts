/**
 * Envio de email via Brevo (compartilhado nas iscas).
 */
import { getVar } from './runtime-env';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailParams {
  paraEmail: string;
  paraNome: string;
  assunto: string;
  html: string;
}

export async function enviarEmail({
  paraEmail,
  paraNome,
  assunto,
  html,
}: SendEmailParams): Promise<boolean> {
  const apiKey = getVar('BREVO_API_KEY');
  const senderEmail = getVar('BREVO_SENDER_EMAIL');

  if (!apiKey || !senderEmail) {
    console.warn('[email] BREVO_API_KEY/BREVO_SENDER_EMAIL ausentes — envio pulado');
    return false;
  }

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Bruno Medeiros — SEO', email: senderEmail },
      to: [{ email: paraEmail, name: paraNome }],
      subject: assunto,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    console.error(`[email] Brevo ${res.status}: ${corpo.slice(0, 300)}`);
    return false;
  }
  return true;
}
