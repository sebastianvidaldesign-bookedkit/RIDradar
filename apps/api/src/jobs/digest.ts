import { prisma } from "../lib/prisma";
import { config } from "../config";
import { logger } from "../lib/logger";
import { sendEmail } from "../email/index";
import type { Mention } from "@prisma/client";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function snippet(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

function platformBadge(platform: string): string {
  const colors: Record<string, string> = {
    reddit: "#FF4500",
    rss: "#FFA500",
    search: "#4285F4",
    x: "#000000",
  };
  const color = colors[platform] || "#666";
  return `<span style="display:inline-block;background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${escapeHtml(platform)}</span>`;
}

function urgencyColor(urgency: string | null): string {
  if (urgency === "high") return "#dc2626";
  if (urgency === "medium") return "#f59e0b";
  return "#6b7280";
}

function renderMentionRow(m: Mention, webBase: string): string {
  const dashUrl = `${webBase}/mentions/${m.id}`;
  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 8px;vertical-align:top;">
        ${platformBadge(m.platform)}
        <span style="font-size:11px;color:#6b7280;margin-left:6px;">${escapeHtml(m.sourceName)}</span>
      </td>
      <td style="padding:12px 8px;">
        <div style="font-weight:600;margin-bottom:4px;">
          <a href="${escapeHtml(m.url)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(m.title || "(no title)")}</a>
        </div>
        <div style="font-size:13px;color:#4b5563;margin-bottom:6px;">
          ${escapeHtml(snippet(m.content))}
        </div>
        <div style="font-size:11px;">
          <span style="color:${urgencyColor(m.urgency)};font-weight:600;">${escapeHtml(m.urgency || "low")} urgency</span>
          <span style="color:#6b7280;margin:0 6px;">|</span>
          <span style="color:#6b7280;">${escapeHtml(m.intent || "other")}</span>
          <span style="color:#6b7280;margin:0 6px;">|</span>
          <span style="color:#6b7280;">${escapeHtml(m.audience || "unknown")}</span>
        </div>
      </td>
      <td style="padding:12px 8px;text-align:center;vertical-align:top;">
        <div style="font-size:20px;font-weight:700;color:${m.score >= 85 ? "#16a34a" : "#f59e0b"};">${m.score}</div>
      </td>
      <td style="padding:12px 8px;vertical-align:top;white-space:nowrap;">
        <a href="${escapeHtml(m.url)}" style="display:inline-block;padding:4px 10px;background:#1d4ed8;color:#fff;border-radius:4px;text-decoration:none;font-size:12px;margin-bottom:4px;">Source</a>
        <br>
        <a href="${escapeHtml(dashUrl)}" style="display:inline-block;padding:4px 10px;background:#6b7280;color:#fff;border-radius:4px;text-decoration:none;font-size:12px;">Dashboard</a>
      </td>
    </tr>`;
}

function buildDigestHtml(high: Mention[], medium: Mention[], webBase: string): string {
  const totalCount = high.length + medium.length;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: config.digestTimezone,
  });

  let body = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
    <h1 style="font-size:22px;margin:0 0 4px 0;color:#111827;">BookedKit Radar — Daily Digest</h1>
    <p style="color:#6b7280;margin:0 0 20px 0;font-size:14px;">${date} | ${totalCount} new mention${totalCount !== 1 ? "s" : ""}</p>`;

  if (high.length > 0) {
    body += `
    <h2 style="font-size:16px;color:#dc2626;margin:24px 0 12px;border-bottom:2px solid #dc2626;padding-bottom:6px;">
      High Priority (score >= 85) — ${high.length} mention${high.length !== 1 ? "s" : ""}
    </h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;text-align:left;">
          <th style="padding:8px;font-size:12px;color:#6b7280;width:140px;">Source</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;">Content</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;width:60px;text-align:center;">Score</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;width:90px;">Links</th>
        </tr>
      </thead>
      <tbody>
        ${high.map((m) => renderMentionRow(m, webBase)).join("")}
      </tbody>
    </table>`;
  }

  if (medium.length > 0) {
    body += `
    <h2 style="font-size:16px;color:#f59e0b;margin:24px 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;">
      Medium Priority (score 70-84) — ${medium.length} mention${medium.length !== 1 ? "s" : ""}
    </h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;text-align:left;">
          <th style="padding:8px;font-size:12px;color:#6b7280;width:140px;">Source</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;">Content</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;width:60px;text-align:center;">Score</th>
          <th style="padding:8px;font-size:12px;color:#6b7280;width:90px;">Links</th>
        </tr>
      </thead>
      <tbody>
        ${medium.map((m) => renderMentionRow(m, webBase)).join("")}
      </tbody>
    </table>`;
  }

  if (totalCount === 0) {
    body += `
    <div style="text-align:center;padding:40px 20px;color:#6b7280;">
      <p style="font-size:16px;">No new relevant mentions in the last 24 hours.</p>
      <p style="font-size:13px;">The radar is still watching. Check back tomorrow!</p>
    </div>`;
  }

  body += `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      <a href="${escapeHtml(webBase)}" style="color:#6b7280;">Open Dashboard</a>
      <span style="margin:0 8px;">|</span>
      BookedKit Radar v1
    </div>
  </div>
</body>
</html>`;

  return body;
}

export async function runDigest(): Promise<number> {
  logger.info("Starting daily digest...");

  // Read threshold + max history days from settings or config
  let threshold = config.scoreThreshold;
  let maxHistoryDays = config.maxHistoryDays;
  try {
    const [threshSetting, histSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "score_threshold" } }),
      prisma.setting.findUnique({ where: { key: "max_history_days" } }),
    ]);
    if (threshSetting) threshold = parseInt(threshSetting.value, 10);
    if (histSetting) maxHistoryDays = parseInt(histSetting.value, 10);
  } catch {}

  // Query: relevant, above threshold, not yet digested, within MAX_HISTORY_DAYS
  const cutoff = new Date(Date.now() - maxHistoryDays * 24 * 60 * 60 * 1000);

  const mentions = await prisma.mention.findMany({
    where: {
      relevant: true,
      score: { gte: threshold },
      digestedAt: null,
      fetchedAt: { gte: cutoff },
    },
    orderBy: { score: "desc" },
  });

  logger.info(`Digest found ${mentions.length} mentions to include`);

  // Do NOT send if zero new items
  if (mentions.length === 0) {
    logger.info("Digest skipped: no new items to send");
    return 0;
  }

  const high = mentions.filter((m) => m.score >= 85);
  const medium = mentions.filter((m) => m.score >= threshold && m.score < 85);

  const html = buildDigestHtml(high, medium, config.publicWebBaseUrl);

  // Subject format: "BookedKit Radar — Daily EPK leads (N) — YYYY-MM-DD"
  const today = new Date().toLocaleDateString("en-CA", { timeZone: config.digestTimezone }); // YYYY-MM-DD
  const subject = `BookedKit Radar — Daily EPK leads (${mentions.length}) — ${today}`;

  await sendEmail(subject, html);

  // Mark all as digested
  const mentionIds = mentions.map((m) => m.id);
  await prisma.mention.updateMany({
    where: { id: { in: mentionIds } },
    data: { digestedAt: new Date() },
  });

  logger.info(`Digest sent successfully, marked ${mentionIds.length} mentions as digested`);
  return mentions.length;
}
