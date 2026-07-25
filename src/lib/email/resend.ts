import { Resend } from "resend";

const APP_NAME = "English Conversation Tutor";

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (get one at https://resend.com/api-keys) to enable password-reset emails.",
    );
  }
  return key;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;
}

function getBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
}

let cached: Resend | null = null;
function getClient(): Resend {
  if (cached) return cached;
  cached = new Resend(getApiKey());
  return cached;
}

/**
 * Send a password-reset email containing a single-use link valid for 1 hour.
 * Throws if `RESEND_API_KEY` is missing or the Resend API rejects the send.
 * Callers should catch and surface a generic "we couldn't send the email"
 * message so the UI doesn't leak infrastructure details.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const resetUrl = `${getBaseUrl().replace(/\/$/, "")}/reset?token=${encodeURIComponent(rawToken)}`;
  const client = getClient();
  const { error } = await client.emails.send({
    from: getFromAddress(),
    to,
    subject: `Redefina sua senha — ${APP_NAME}`,
    text: textBody(resetUrl),
    html: htmlBody(resetUrl),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function textBody(resetUrl: string): string {
  return [
    `Olá,`,
    ``,
    `Recebemos um pedido para redefinir a senha da sua conta no ${APP_NAME}.`,
    `Se você fez esse pedido, clique no link abaixo para definir uma nova senha:`,
    ``,
    resetUrl,
    ``,
    `O link expira em 1 hora e só pode ser usado uma vez.`,
    ``,
    `Se você não fez esse pedido, ignore esta mensagem — sua senha continua a mesma.`,
    ``,
    `— Equipe ${APP_NAME}`,
  ].join("\n");
}

function htmlBody(resetUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">Redefina sua senha</h1>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:22px;color:#475569;">
                  Recebemos um pedido para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.
                </p>
                <p style="margin:0 0 24px 0;text-align:center;">
                  <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px;">
                    Definir nova senha
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:12px;line-height:20px;color:#64748b;">
                  Este link expira em <strong>1 hora</strong> e só pode ser usado uma vez.
                </p>
                <p style="margin:0 0 16px 0;font-size:12px;line-height:20px;color:#64748b;">
                  Se o botão não funcionar, cole este link no navegador:<br />
                  <span style="word-break:break-all;color:#0ea5e9;">${resetUrl}</span>
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
                <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;">
                  Se você não fez esse pedido, ignore esta mensagem — sua senha continua a mesma.
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
