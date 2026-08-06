export interface NormalizedNameParts {
  fullName: string;
  firstName: string;
  lastName: string;
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function splitFullName(fullName: string): NormalizedNameParts {
  const normalized = normalizeWhitespace(fullName);
  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return { fullName: "", firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return {
      fullName: normalized,
      firstName: parts[0]!,
      lastName: ""
    };
  }

  return {
    fullName: normalized,
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" ")
  };
}

export function joinNames(firstName: string, lastName: string): NormalizedNameParts {
  const first = normalizeWhitespace(firstName);
  const last = normalizeWhitespace(lastName);
  const fullName = normalizeWhitespace([first, last].filter(Boolean).join(" "));

  return {
    fullName,
    firstName: first,
    lastName: last
  };
}
