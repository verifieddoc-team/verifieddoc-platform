import { Prisma } from "@prisma/client";

export function isUniqueConstraintError(error: unknown, fields: string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (!target) {
    return false;
  }

  const targetFields = Array.isArray(target) ? target.map(String) : [String(target)];
  return fields.every((field) => targetFields.includes(field));
}
