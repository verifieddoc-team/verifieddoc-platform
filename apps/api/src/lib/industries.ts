/**
 * Canonical public industry catalog for organization registration.
 * Codes are stable API identifiers; labels match the mobile signup design list.
 * No OTHER option — the approved design list does not include one.
 */
export const INDUSTRIES = [
  { code: "HR_RECRUITMENT", label: "HR & Recruitment" },
  { code: "BANKING_FINTECH", label: "Banking & FinTech" },
  { code: "EDUCATION", label: "Education" },
  { code: "GOVERNMENT_GOVTECH", label: "Government / GovTech" },
  { code: "LEGAL_SERVICES", label: "Legal Services" },
  { code: "REAL_ESTATE_PROPTECH", label: "Real Estate / PropTech" },
  { code: "INSURANCE", label: "Insurance" },
  { code: "TRANSPORTATION", label: "Transportation" },
  { code: "PROFESSIONAL_LICENSING", label: "Professional Licensing" },
  { code: "BACKGROUND_SCREENING", label: "Background Screening" }
] as const;

export type IndustryCode = (typeof INDUSTRIES)[number]["code"];
export type IndustryOption = (typeof INDUSTRIES)[number];

const byCode = new Map<string, IndustryOption>(INDUSTRIES.map((item) => [item.code, item]));
const byLabel = new Map<string, IndustryOption>(
  INDUSTRIES.map((item) => [item.label.toLowerCase(), item])
);

/**
 * Normalize organization industry input.
 * - Approved codes → stored as code
 * - Approved labels (case-insensitive) → stored as code
 * - Unknown values → accepted temporarily for backward compatibility and stored trimmed as-is
 */
export function normalizeIndustryInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  const codeMatch = byCode.get(trimmed);
  if (codeMatch) {
    return codeMatch.code;
  }

  const labelMatch = byLabel.get(trimmed.toLowerCase());
  if (labelMatch) {
    return labelMatch.code;
  }

  return trimmed;
}

export function listIndustries(): IndustryOption[] {
  return [...INDUSTRIES];
}
