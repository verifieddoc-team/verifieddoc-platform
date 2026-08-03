import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { toPublicUser, type PublicUser } from "../../lib/users.js";
import type { UpdateProfileInput } from "./profile.schemas.js";

export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {})
      }
    });

    return toPublicUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    throw error;
  }
}
