import { config } from "../config";
import { logger } from "../lib/logger";
import { sendViaSendGrid } from "./sendgrid";
import { sendViaSmtp } from "./smtp";
import { sendViaDevFile } from "./devfile";

type SendFn = (to: string, from: string, subject: string, html: string) => Promise<void>;

function resolveProvider(): { name: string; send: SendFn } {
  const explicit = config.emailProvider.toLowerCase();

  if (explicit === "sendgrid" && config.sendgridApiKey) {
    return { name: "SendGrid", send: sendViaSendGrid };
  }
  if (explicit === "smtp" && config.smtpHost) {
    return { name: "SMTP", send: sendViaSmtp };
  }
  if (explicit === "devfile") {
    return { name: "DevFile", send: sendViaDevFile };
  }

  // Auto-detect
  if (explicit === "auto" || !explicit) {
    if (config.sendgridApiKey) return { name: "SendGrid", send: sendViaSendGrid };
    if (config.smtpHost) return { name: "SMTP", send: sendViaSmtp };
  }

  return { name: "DevFile", send: sendViaDevFile };
}

export async function sendEmail(subject: string, html: string): Promise<void> {
  const { name, send } = resolveProvider();

  const to = config.digestToEmail;
  const from = config.digestFromEmail;

  if (!to) {
    logger.warn("No DIGEST_TO_EMAIL set, skipping email send");
    // Still write to dev file for local development
    await sendViaDevFile("(not set)", from, subject, html);
    return;
  }

  logger.info(`Sending email via ${name} to ${to}`);
  await send(to, from, subject, html);
}
