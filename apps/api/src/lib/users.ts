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
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicUserSource = Pick<
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
> & {
  emailVerifiedAt?: Date | null;
};

export function toPublicUser(user: PublicUserSource): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
