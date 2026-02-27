import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

export async function sendViaDevFile(
  _to: string,
  _from: string,
  subject: string,
  html: string
): Promise<void> {
  const dir = path.resolve(process.cwd(), "digests");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const date = new Date().toISOString().split("T")[0];
  const timestamp = Date.now();
  const filename = `${date}-${timestamp}.html`;
  const filepath = path.join(dir, filename);

  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body>
<div style="background:#f0f0f0;padding:12px;margin-bottom:20px;font-family:monospace;font-size:12px;">
  <strong>DEV MODE — Email not actually sent</strong><br>
  To: ${_to}<br>
  From: ${_from}<br>
  Subject: ${subject}<br>
  Date: ${new Date().toISOString()}
</div>
${html}
</body>
</html>`;

  fs.writeFileSync(filepath, fullHtml, "utf-8");
  logger.info(`Digest written to local file: ${filepath}`);
  logger.info(`Open in browser: file://${filepath}`);
}
