import type { User } from "@prisma/client";

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: User["role"];
  status: User["status"];
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUser(
  user: Pick<
    User,
    | "id"
    | "email"
    | "fullName"
    | "firstName"
    | "lastName"
    | "phone"
    | "role"
    | "status"
    | "createdAt"
    | "updatedAt"
  >
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
