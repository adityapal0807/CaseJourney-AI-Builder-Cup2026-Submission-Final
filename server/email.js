import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let resend;
function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
const __dirname = dirname(fileURLToPath(import.meta.url));

export function renderTemplate(templateName, vars) {
  const filePath = join(__dirname, 'email-templates', `${templateName}.html`);
  let html = readFileSync(filePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? '');
  }
  return html;
}

export async function sendEmail({ to, subject, html, from = process.env.RESEND_FROM_EMAIL || 'noreply@casejourney.co.in' }) {
  return getResendClient().emails.send({ from, to, subject, html });
}
