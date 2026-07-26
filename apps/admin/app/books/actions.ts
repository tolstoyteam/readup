"use server";

import { revalidatePath } from "next/cache";
import { deleteWorkById } from "@/lib/book-relational";
import { requireAdminPage } from "@/lib/admin-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export async function deleteBook(formData: FormData) {
  await requireAdminPage();

  const workId = formData.get("workId");
  if (typeof workId !== "string" || !UUID_RE.test(workId)) {
    throw new Error("Invalid book id");
  }

  const result = await deleteWorkById(workId);
  if (!result) {
    throw new Error("Book not found");
  }

  revalidatePath("/books");
}
