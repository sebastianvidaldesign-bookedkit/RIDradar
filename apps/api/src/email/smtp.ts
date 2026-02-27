import nodemailer from "nodemailer";
import { config } from "../config";
import { logger } from "../lib/logger";

export async function sendViaSmtp(
  to: string,
  from: string,
  subject: string,
  html: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  logger.info(`Digest email sent via SMTP to ${to}`);
}
