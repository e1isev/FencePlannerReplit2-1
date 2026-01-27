export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  extra?: unknown;
};

export type BreadcrumbEntry = {
  id: string;
  message: string;
  category: string;
  timestamp: string;
};

const MAX_LOG_ENTRIES = 200;
const MAX_BREADCRUMBS = 50;

const logEntries: LogEntry[] = [];
const breadcrumbs: BreadcrumbEntry[] = [];

const sessionId = (() => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
})();

const pushEntry = <T>(buffer: T[], entry: T, limit: number) => {
  buffer.push(entry);
  if (buffer.length > limit) {
    buffer.splice(0, buffer.length - limit);
  }
};

const addLogEntry = (level: LogLevel, message: string, extra?: unknown) => {
  pushEntry(
    logEntries,
    {
      level,
      message,
      timestamp: new Date().toISOString(),
      extra,
    },
    MAX_LOG_ENTRIES
  );
};

const addBreadcrumb = (message: string, category: string) => {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `crumb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  pushEntry(
    breadcrumbs,
    {
      id,
      message,
      category,
      timestamp: new Date().toISOString(),
    },
    MAX_BREADCRUMBS
  );
};

const consoleMap: Record<LogLevel, keyof Console> = {
  info: "info",
  warn: "warn",
  error: "error",
};

let captureInitialized = false;

export const initializeBugReportCapture = () => {
  if (captureInitialized || typeof window === "undefined") return;
  captureInitialized = true;

  (Object.keys(consoleMap) as LogLevel[]).forEach((level) => {
    const method = consoleMap[level];
    const original = console[method];
    if (!original) return;

    console[method] = (...args: unknown[]) => {
      const message = args
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(" ");
      addLogEntry(level, message, args.length > 1 ? args : undefined);
      original.apply(console, args as []);
    };
  });

  window.addEventListener("error", (event) => {
    const message = event.message || "Uncaught error";
    addLogEntry("error", message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error ? String(event.error) : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason ? String(event.reason) : "Unhandled promise rejection";
    addLogEntry("error", reason);
  });
};

export const bugReportLogger = {
  info: (message: string, extra?: unknown) => addLogEntry("info", message, extra),
  warn: (message: string, extra?: unknown) => addLogEntry("warn", message, extra),
  error: (message: string, extra?: unknown) => addLogEntry("error", message, extra),
  breadcrumb: (message: string, category = "ui") => addBreadcrumb(message, category),
};

export const getBugReportSessionId = () => sessionId;

export const getLogEntries = () => [...logEntries];

export const getBreadcrumbs = () => [...breadcrumbs];

export const getDeviceInfo = () => {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {};
  }

  const connection =
    (navigator as Navigator & { connection?: { effectiveType?: string; rtt?: number; downlink?: number } })
      .connection;

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      devicePixelRatio: window.devicePixelRatio ?? null,
    },
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    network: {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType ?? null,
      rtt: connection?.rtt ?? null,
      downlink: connection?.downlink ?? null,
    },
  };
};

export const captureCanvasScreenshot = (): string | null => {
  if (typeof document === "undefined") return null;

  const canvases = Array.from(document.querySelectorAll("canvas"));
  if (canvases.length === 0) return null;

  const target = canvases.reduce<HTMLCanvasElement | null>((best, canvas) => {
    const area = canvas.width * canvas.height;
    if (!best) return canvas;
    return area > best.width * best.height ? canvas : best;
  }, null);

  if (!target) return null;

  try {
    return target.toDataURL("image/png");
  } catch (error) {
    addLogEntry("warn", "Failed to capture canvas screenshot.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};
