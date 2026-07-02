import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import {
  createGenerationJob,
  getBookWithContent,
  markGenerationJobRunning,
  updateEditionStatus,
  updateGenerationJob,
} from "@/lib/book-relational";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const edition = await getBookWithContent(id);
  if (!edition) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const job = await createGenerationJob({
    workId: edition.workId,
    editionId: edition.id,
    type: "tts",
    payload: { edition_id: edition.id, language: edition.language },
  });

  try {
    await markGenerationJobRunning(job.id);
    await updateEditionStatus(edition.id, "generating_tts");
    const extras = await finalizeBookTtsForBook(edition);
    await updateGenerationJob(job.id, extras.tts_warning ? "failed" : "succeeded", extras.tts_warning ?? null);
    return Response.json({
      ok: !extras.tts_warning,
      job_id: job.id,
      id: edition.id,
      book_id: String(edition.id),
      work_id: edition.workId,
      ...extras,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "TTS generation failed";
    await updateEditionStatus(edition.id, "failed", "ttsError", message);
    await updateGenerationJob(job.id, "failed", message);
    return Response.json({ error: message, job_id: job.id }, { status: 502 });
  }
}
