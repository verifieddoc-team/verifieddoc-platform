import type { User } from "@prisma/client";

export type PublicUser = Pick<User, "id" | "email" | "firstName" | "lastName" | "role" | "createdAt" | "updatedAt">;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
