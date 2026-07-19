const VERIFY_API_PATH_PREFIX = "/api/v1/verify/";

export function sanitizeRequestUrl(url: string): string {
  if (!url) {
    return url;
  }

  const queryIndex = url.indexOf("?");
  const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : url.slice(queryIndex);

  if (pathname === "/api/v1/verify") {
    return `${pathname}${query}`;
  }

  if (pathname.startsWith(VERIFY_API_PATH_PREFIX)) {
    const suffix = pathname.slice(VERIFY_API_PATH_PREFIX.length);
    if (suffix.length > 0 && suffix !== "[REDACTED]") {
      return `${VERIFY_API_PATH_PREFIX}[REDACTED]${query}`;
    }
  }

  return url;
}

export function sanitizeRequestParams(
  params: Record<string, string | undefined> | undefined
): Record<string, string | undefined> | undefined {
  if (!params?.token) {
    return params;
  }

  return {
    ...params,
    token: "[REDACTED]"
  };
}
