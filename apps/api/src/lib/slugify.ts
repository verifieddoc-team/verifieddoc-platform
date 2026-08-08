export function slugifyOrganizationName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (slug.length >= 3) {
    return slug.slice(0, 100);
  }

  return `org-${slug || "organization"}`.slice(0, 100);
}

export function withSlugSuffix(baseSlug: string, attempt: number): string {
  if (attempt <= 0) {
    return baseSlug.slice(0, 100);
  }

  const suffix = `-${attempt + 1}`;
  const maxBase = Math.max(1, 100 - suffix.length);
  return `${baseSlug.slice(0, maxBase)}${suffix}`;
}
