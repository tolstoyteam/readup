"use server";

import { revalidatePath } from "next/cache";
import { deleteWorkById, isWorkUuid } from "@/lib/book-relational";
import { requireAdminPage } from "@/lib/admin-auth";

export type DeleteBookState =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteBook(
  _prevState: DeleteBookState | null,
  formData: FormData,
): Promise<DeleteBookState> {
  try {
    await requireAdminPage();

    const workId = formData.get("workId");
    if (typeof workId !== "string" || !isWorkUuid(workId)) {
      return { ok: false, error: "Invalid book id" };
    }

    const result = await deleteWorkById(workId);
    if (!result) {
      return { ok: false, error: "Book not found" };
    }

    revalidatePath("/books");
    return { ok: true };
  } catch (e) {
    console.error("deleteBook:", e);
    return {
      ok: false,
      error: "Failed to delete book. Please try again.",
    };
  }
}
