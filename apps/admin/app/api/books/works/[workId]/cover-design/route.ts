import { eq } from "drizzle-orm";
import { booksTable } from "@readup/db";
import { db } from "@/db/client";
import { requireAdminApi } from "@/lib/admin-auth";
import { getBookWithContent } from "@/lib/book-relational";
import { sanitizeCoverError } from "@/lib/cover-prompt";
import {
  CoverConflictError, ensureCoverDraft, generateCoverSource, getCoverDesign,
  publishCover, replaceCoverSource, saveCoverDraft,
} from "@/lib/cover-design-service";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ workId: string }> };

function errorResponse(error: unknown) {
  const message = sanitizeCoverError(error);
  return Response.json({ error: message }, { status: error instanceof CoverConflictError ? 409 : 400 });
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth) return auth;
  const { workId } = await context.params;
  const design = await getCoverDesign(workId);
  return design ? Response.json(design) : Response.json({ error: "Work not found." }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth) return auth;
  const { workId } = await context.params;
  try {
    const body = await request.json();
    if (!Number.isInteger(body.revision)) throw new Error("Revision is required.");
    await saveCoverDraft(workId, body.revision, body.recipe ?? {});
    return Response.json(await getCoverDesign(workId));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth) return auth;
  const { workId } = await context.params;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("source");
      const revision = Number(form.get("revision"));
      if (!(file instanceof File) || file.size < 1 || file.size > 8 * 1024 * 1024 || !Number.isInteger(revision)) {
        throw new Error("Choose an image up to 8 MB and reload the current revision.");
      }
      await replaceCoverSource(workId, revision, Buffer.from(await file.arrayBuffer()));
      return Response.json(await getCoverDesign(workId));
    }
    const body = await request.json();
    if (body.action === "create") {
      const [book] = await db.select({ id: booksTable.id, title: booksTable.title, author: booksTable.author })
        .from(booksTable).where(eq(booksTable.workId, workId)).limit(1);
      const fullBook = book ? await getBookWithContent(book.id) : null;
      const title = String(body.title ?? book?.title ?? "");
      const author = String(body.author ?? book?.author ?? "");
      if (!title.trim() || !author.trim()) throw new Error("Work title and author are required.");
      await ensureCoverDraft({ workId, title, author, genres: fullBook?.genres });
    } else if (body.action === "generate") {
      await generateCoverSource(workId);
    } else if (body.action === "publish") {
      if (!Number.isInteger(body.revision)) throw new Error("Revision is required.");
      if (body.expectedActivePath !== null && typeof body.expectedActivePath !== "string") {
        throw new Error("Current cover path is required. Reload the builder.");
      }
      await publishCover(workId, body.revision, body.expectedActivePath);
    } else throw new Error("Unknown cover action.");
    return Response.json(await getCoverDesign(workId));
  } catch (error) { return errorResponse(error); }
}
