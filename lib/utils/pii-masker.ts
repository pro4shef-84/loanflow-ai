/**
 * Masks PII (SSN, account numbers, DOB) before sending data to the Claude API.
 */

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g;
const ACCOUNT_NUMBER_PATTERN = /\b\d{8,17}\b/g;
const DOB_PATTERN =
  /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})\b|\b\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;

export function maskPii(text: string): string {
  return text
    .replace(SSN_PATTERN, "[SSN_REDACTED]")
    .replace(DOB_PATTERN, "[DOB_REDACTED]")
    .replace(ACCOUNT_NUMBER_PATTERN, (match) => {
      const last4 = match.slice(-4);
      return `[ACCT_****${last4}]`;
    });
}

export function maskObject(obj: unknown): unknown {
  if (typeof obj === "string") return maskPii(obj);
  if (Array.isArray(obj)) return obj.map(maskObject);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, maskObject(v)])
    );
  }
  return obj;
}
