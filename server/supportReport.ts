import { promises as fs } from "fs";
import path from "path";
import { log } from "./vite";

type StoredFiles = {
  reportPath: string;
  logsPath: string;
  screenshotPath?: string | null;
};

const REPORTS_DIR = path.resolve("server/data/support-reports");
const DEFAULT_SUPPORT_EMAIL = "engineering@thinkfencing.com.au";

const ensureReportsDir = async () => {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
};

const buildLogsText = (payload: Record<string, unknown>) => {
  const logs = Array.isArray(payload.logs) ? payload.logs : [];
  if (!logs.length) return "No client logs captured.";

  return logs
    .map((entry) => {
      const level = (entry as { level?: string }).level ?? "info";
      const timestamp = (entry as { timestamp?: string }).timestamp ?? "";
      const message = (entry as { message?: string }).message ?? "";
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
    .join("\n");
};

export const persistSupportReport = async (
  reportId: string,
  payload: Record<string, unknown>,
  screenshotBuffer?: Buffer | null
): Promise<StoredFiles> => {
  await ensureReportsDir();
  const reportDir = path.join(REPORTS_DIR, reportId);
  await fs.mkdir(reportDir, { recursive: true });

  const reportPath = path.join(reportDir, "report.json");
  const logsPath = path.join(reportDir, "logs.txt");
  const screenshotPath = screenshotBuffer ? path.join(reportDir, "screenshot.png") : null;

  await fs.writeFile(reportPath, JSON.stringify(payload, null, 2));
  await fs.writeFile(logsPath, buildLogsText(payload));

  if (screenshotBuffer && screenshotPath) {
    await fs.writeFile(screenshotPath, screenshotBuffer);
  }

  return { reportPath, logsPath, screenshotPath };
};

type EmailResult = {
  status: "sent" | "skipped" | "failed";
  message?: string;
};

export const sendSupportReportEmail = async (
  reportId: string,
  payload: Record<string, unknown>,
  files: StoredFiles
): Promise<EmailResult> => {
  const webhookUrl = process.env.SUPPORT_REPORT_EMAIL_WEBHOOK_URL;
  const to = process.env.SUPPORT_REPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL;

  if (!webhookUrl) {
    log("Support report email skipped: webhook not configured.", "support");
    return { status: "skipped", message: "Email webhook not configured" };
  }

  const description = (payload.description as string | undefined) ?? "";
  const expectation = (payload.expectation as string | undefined) ?? "";
  const route =
    (payload.context as { route?: string } | undefined)?.route ?? "Unknown route";
  const reporter =
    (payload.context as { user?: { email?: string } } | undefined)?.user?.email ?? "Unknown";

  const text = [
    `Report ID: ${reportId}`,
    `Route: ${route}`,
    `Reporter: ${reporter}`,
    "",
    "What happened:",
    description,
    "",
    "Expected behavior:",
    expectation,
  ].join("\n");

  try {
    const attachments = [
      {
        filename: "report.json",
        content: await fs.readFile(files.reportPath, "utf8"),
        encoding: "utf8",
      },
      {
        filename: "logs.txt",
        content: await fs.readFile(files.logsPath, "utf8"),
        encoding: "utf8",
      },
    ];

    if (files.screenshotPath) {
      const screenshot = await fs.readFile(files.screenshotPath);
      attachments.push({
        filename: "screenshot.png",
        content: screenshot.toString("base64"),
        encoding: "base64",
      });
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: `FencePlanner report ${reportId}`,
        text,
        reportId,
        attachments,
      }),
    });
    return { status: "sent" };
  } catch (error) {
    log(`Support report email failed: ${String(error)}`, "support");
    return { status: "failed", message: String(error) };
  }
};

export const parseScreenshotDataUrl = (dataUrl?: string | null): Buffer | null => {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
};
