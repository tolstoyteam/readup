"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { adminUsersTable } from "@readup/db";
import { db } from "@/db/client";
import { requireAdminPage } from "@/lib/admin-auth";

function readUserId(formData: FormData): string {
  const userId = formData.get("userId");
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Missing user id");
  }
  return userId;
}

export async function assignAdmin(formData: FormData) {
  await requireAdminPage();
  const userId = readUserId(formData);

  await db
    .insert(adminUsersTable)
    .values({ userId })
    .onConflictDoNothing({ target: adminUsersTable.userId });

  revalidatePath("/");
}

export async function revokeAdmin(formData: FormData) {
  const auth = await requireAdminPage();
  const userId = readUserId(formData);

  if (userId === auth.userId) {
    throw new Error("You cannot revoke your own admin access.");
  }

  await db.delete(adminUsersTable).where(eq(adminUsersTable.userId, userId));
  revalidatePath("/");
}
