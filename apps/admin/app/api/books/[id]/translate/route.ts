import { translateBookEdition } from "@/lib/book-ai-translate";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import {
  createEditionForWork,
  createGenerationJob,
  getBookWithContent,
  getEditionByWorkLanguage,
  markGenerationJobRunning,
  replaceBookContent,
  updateEditionStatus,
  updateGenerationJob,
} from "@/lib/book-relational";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await context.params;
  const sourceId = parseId(idParam);
  if (sourceId === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const targetLanguage =
    typeof body?.target_language === "string" && body.target_language.trim()
      ? body.target_language.trim()
      : "en";
  const generateTts = body?.generate_tts !== false;

  const source = await getBookWithContent(sourceId);
  if (!source) {
    return Response.json({ error: "Source edition not found" }, { status: 404 });
  }
  if (source.language === targetLanguage) {
    return Response.json({ error: "Target language matches source edition" }, { status: 400 });
  }

  const job = await createGenerationJob({
    workId: source.workId,
    editionId: source.id,
    type: "translation",
    payload: { source_edition_id: source.id, target_language: targetLanguage, generate_tts: generateTts },
  });

  try {
    await markGenerationJobRunning(job.id);
    const translatedInput = await translateBookEdition({ source, targetLanguage });
    const existing = await getEditionByWorkLanguage(source.workId, targetLanguage);
    const edition = existing
      ? await replaceBookContent(existing.id, translatedInput)
      : await createEditionForWork({
          workId: source.workId,
          input: translatedInput,
          status: generateTts ? "generating_tts" : "published",
          sourceEditionId: source.id,
        });

    if (!edition) {
      throw new Error("Could not save translated edition.");
    }

    const tts = generateTts ? await finalizeBookTtsForBook(edition) : {};
    await updateGenerationJob(job.id, "succeeded");
    return Response.json({
      ok: true,
      job_id: job.id,
      id: edition.id,
      book_id: String(edition.id),
      work_id: edition.workId,
      language: edition.language,
      status: edition.status,
      ...tts,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Translation failed";
    await updateGenerationJob(job.id, "failed", message);
    const failed = await getEditionByWorkLanguage(source.workId, targetLanguage);
    if (failed) {
      await updateEditionStatus(failed.id, "failed", "translationError", message);
    }
    return Response.json({ error: message, job_id: job.id }, { status: 502 });
  }
}
