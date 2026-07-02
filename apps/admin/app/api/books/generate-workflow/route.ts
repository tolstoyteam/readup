import "server-only";

import {
  SUPPORTED_SOURCE_DESCRIPTION,
  extractSourceText,
  truncateSourceText,
} from "@/lib/book-source-text";
import { runBookGenerationWorkflow } from "@/lib/book-generation/orchestrate";
import { parseWorkflowSettings, type ProgressEvent } from "@/lib/book-generation/types";
import { parseCoverUpload } from "@/lib/cover-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

function sseEncode(event: ProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
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
      audience: form.get("audience"),
      genre: form.get("genre"),
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      try {
        await runBookGenerationWorkflow({
          settings: parsed.data,
          source,
          cover: coverParsed.cover ?? null,
          onProgress: send,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Book generation failed.";
        if (message) {
          send({ step: "error", message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
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
