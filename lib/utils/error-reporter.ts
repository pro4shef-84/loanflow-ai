// ============================================================
// CLIENT-SIDE ERROR REPORTER
// Captures API failures and UI errors, logs to console and
// optionally to a server endpoint for monitoring.
// ============================================================

interface ErrorReport {
  type: "api_error" | "ui_error" | "unhandled";
  message: string;
  url?: string;
  status?: number;
  method?: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const errorLog: ErrorReport[] = [];
const MAX_LOG_SIZE = 50;

/** Report an API error (call after fetch failures) */
export function reportApiError(
  url: string,
  method: string,
  status: number,
  message: string,
  context?: Record<string, unknown>
) {
  const report: ErrorReport = {
    type: "api_error",
    message,
    url,
    status,
    method,
    timestamp: new Date().toISOString(),
    context,
  };
  pushReport(report);
}

/** Report a UI/component error */
export function reportUiError(error: Error, context?: Record<string, unknown>) {
  const report: ErrorReport = {
    type: "ui_error",
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };
  pushReport(report);
}

/** Get recent error log (useful for debugging) */
export function getErrorLog(): ErrorReport[] {
  return [...errorLog];
}

/** Clear error log */
export function clearErrorLog() {
  errorLog.length = 0;
}

function pushReport(report: ErrorReport) {
  console.error(`[LoanFlow ${report.type}]`, report.message, report);
  errorLog.push(report);
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }
}

/**
 * Wrapper for fetch that automatically reports errors.
 * Use instead of raw fetch() for API calls.
 */
export async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method ?? "GET";
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.clone().json().catch(() => ({}));
      const msg = body?.error ?? `HTTP ${res.status}`;
      reportApiError(url, method, res.status, msg);
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    reportApiError(url, method, 0, msg);
    throw err;
  }
}
