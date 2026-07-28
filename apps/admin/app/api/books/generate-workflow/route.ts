import "server-only";

import { requireAdminApi } from "@/lib/admin-auth";
import {
  SUPPORTED_SOURCE_DESCRIPTION,
  extractSourceText,
  truncateSourceText,
} from "@/lib/book-source-text";
import {
  parseWorkflowSettings,
  type BookGenerationJobPayload,
} from "@/lib/book-generation/types";
import { createBookWork, createGenerationJob, updateWorkCover } from "@/lib/book-relational";
import { parseCoverUpload, uploadWorkCover } from "@/lib/cover-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const contentType = request.headers.get("content-type") || "";
  let settingsInput: Record<string, unknown> = {};
  let sourceFile: File | null = null;
  let coverField: FormDataEntryValue | null = null;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "Invalid multipart body." }, { status: 400 });
    }

    settingsInput = {
      topic: form.get("topic"),
      reading_level: form.get("reading_level"),
      length: form.get("length") || "medium",
      include_quiz: form.get("include_quiz") !== "false",
      languages: parseLanguagesField(form.get("languages")),
    };

    const sourceField = form.get("source");
    if (sourceField instanceof File && sourceField.size > 0) {
      sourceFile = sourceField;
    }

    coverField = form.get("cover");
  } else {
    try {
      settingsInput = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
  }

  const parsed = parseWorkflowSettings(settingsInput);
  if (!parsed.ok) {
    return Response.json({ error: parsed.message }, { status: 400 });
  }

  let source: { filename: string; text: string } | undefined;
  if (sourceFile) {
    try {
      const extracted = await extractSourceText(sourceFile);
      const trimmed = truncateSourceText(extracted.text);
      if (trimmed.length === 0) {
        return Response.json(
          {
            error: `Source file appears to contain no readable text. Try a different ${SUPPORTED_SOURCE_DESCRIPTION} file.`,
          },
          { status: 400 },
        );
      }
      source = { filename: extracted.filename, text: trimmed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to read the source file.";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  const coverParsed = await parseCoverUpload(coverField);
  if (!coverParsed.ok) {
    return Response.json({ error: coverParsed.message }, { status: 400 });
  }

  const work = await createBookWork();
  let coverPath: string | null = null;
  if (coverParsed.cover) {
    coverPath = await uploadWorkCover(work.id, coverParsed.cover);
    await updateWorkCover(work.id, coverPath);
  }

  const payload: BookGenerationJobPayload = {
    workflow_settings: parsed.data,
    source,
    cover_path: coverPath,
    progress: { step: "queued", message: "Waiting to start..." },
    heartbeat_at: new Date().toISOString(),
    result: null,
  };

  const job = await createGenerationJob({
    workId: work.id,
    type: "book_generation",
    payload: payload as unknown as Record<string, unknown>,
  });

  return Response.json(
    {
      job_id: job.id,
      work_id: work.id,
    },
    { status: 202 },
  );
}

function parseLanguagesField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}
