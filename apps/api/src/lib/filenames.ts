const UNSAFE_FILENAME_CHARS = /[^\w.\- ()[\]]+/g;

function stripControlCharacters(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code !== 127) {
      result += char;
    }
  }
  return result;
}

export function sanitizeFilename(input: string, fallback = "file"): string {
  const trimmed = stripControlCharacters(input.trim());
  const withoutPath = trimmed.split(/[/\\]/).pop() ?? trimmed;
  const collapsed = withoutPath.replace(UNSAFE_FILENAME_CHARS, "_").replace(/\s+/g, " ").trim();

  const withoutLeadingDots = collapsed.replace(/^\.+/, "");
  const sanitized = withoutLeadingDots.slice(0, 200);

  if (!sanitized || sanitized === "." || sanitized === "..") {
    return fallback;
  }

  return sanitized;
}
