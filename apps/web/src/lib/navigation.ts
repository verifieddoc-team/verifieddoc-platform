import type { PlatformRole } from "@verifieddoc/contracts";

export type DemoRole = PlatformRole | "ORGANIZATION_ADMIN";

export function routeForRole(role: DemoRole): string {
  if (role === "PLATFORM_ADMIN") return "/app/admin";
  if (role === "ORGANIZATION_ADMIN") return "/app/organization";
  if (role === "VERIFIER") return "/app/verifier";
  return "/app/holder";
}

export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function formatDate(value: string | null): string {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
