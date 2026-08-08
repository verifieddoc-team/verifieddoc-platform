const DEFAULT_MESSAGE_MAX = 240;
const DEFAULT_CODE_MAX = 80;
const RAW_BODY_READ_MAX = 4_096;

const SENSITIVE_PATTERN =
  /(bearer\s+[a-z0-9._-]+|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|sk_[a-z0-9]+|re_[a-z0-9]+|service_role|apikey\s*[:=]\s*\S+|authorization\s*[:=]\s*\S+)/gi;

function stripControlCharacters(value: string): string {
  // Remove C0/C1 controls and DEL without using control-character regex literals.
  let output = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    if (!isControl) {
      output += char;
    } else if (code === 0x09 || code === 0x0a || code === 0x0d) {
      // Preserve tab/LF/CR so whitespace collapsing can normalize them.
      output += " ";
    }
  }
  return output;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function stringifyUnexpected(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : undefined))
      .filter((entry): entry is string => Boolean(entry))
      .join(" ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Sanitize provider text for logs: redact secrets, strip HTML/controls,
 * collapse whitespace, and truncate to a safe length.
 */
export function sanitizeProviderText(value: unknown, maxLength = DEFAULT_MESSAGE_MAX): string | undefined {
  const asString = stringifyUnexpected(value);
  if (asString === undefined) {
    return undefined;
  }

  const cleaned = stripHtmlTags(stripControlCharacters(asString))
    .replace(SENSITIVE_PATTERN, "[REDACTED]")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
}

export interface SanitizedUpstreamError {
  code?: string;
  message?: string;
}

function extractFromParsedJson(
  parsed: unknown,
  status: number
): SanitizedUpstreamError {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      message: sanitizeProviderText(parsed, DEFAULT_MESSAGE_MAX) ?? `HTTP ${status}`
    };
  }

  const record = parsed as Record<string, unknown>;
  const nestedError =
    record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : undefined;

  const codeCandidate =
    (typeof record.error === "string" && record.error) ||
    (typeof record.name === "string" && record.name) ||
    (typeof record.code === "string" && record.code) ||
    (typeof nestedError?.code === "string" && nestedError.code) ||
    (typeof nestedError?.name === "string" && nestedError.name) ||
    (typeof record.statusCode === "string" && record.statusCode) ||
    (typeof record.statusCode === "number" && String(record.statusCode)) ||
    undefined;

  const messageCandidate =
    (typeof record.message === "string" && record.message) ||
    (typeof nestedError?.message === "string" && nestedError.message) ||
    (typeof record.error === "string" && record.error) ||
    (typeof record.msg === "string" && record.msg) ||
    undefined;

  return {
    code: sanitizeProviderText(codeCandidate, DEFAULT_CODE_MAX),
    message: sanitizeProviderText(messageCandidate, DEFAULT_MESSAGE_MAX) ?? `HTTP ${status}`
  };
}

/**
 * Read a provider response body safely and extract a short, redacted error summary.
 * Consumes the response body.
 */
export async function readSanitizedUpstreamError(
  response: Response
): Promise<SanitizedUpstreamError> {
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    return { message: `HTTP ${response.status}` };
  }

  if (!raw.trim()) {
    return { message: `HTTP ${response.status}` };
  }

  // Bound how much raw body we inspect before sanitizing.
  const bounded = raw.length > RAW_BODY_READ_MAX ? raw.slice(0, RAW_BODY_READ_MAX) : raw;

  try {
    const parsed: unknown = JSON.parse(bounded);
    return extractFromParsedJson(parsed, response.status);
  } catch {
    // Plain text / HTML / unexpected non-JSON bodies.
    return {
      message: sanitizeProviderText(bounded, DEFAULT_MESSAGE_MAX) ?? `HTTP ${response.status}`
    };
  }
}
