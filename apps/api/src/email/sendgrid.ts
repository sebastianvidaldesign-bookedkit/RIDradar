import { config } from "../config";
import { logger } from "../lib/logger";

export async function sendViaSendGrid(
  to: string,
  from: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${text}`);
  }

  logger.info(`Digest email sent via SendGrid to ${to}`);
}
