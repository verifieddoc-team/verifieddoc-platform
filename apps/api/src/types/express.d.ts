import type { OrganizationRole, PlatformRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: PlatformRole;
      };
      organizationMembership?: {
        organizationId: string;
        role: OrganizationRole;
      };
      validatedQuery?: unknown;
    }
  }
}

export {};