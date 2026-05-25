import { generateBookContent } from "@/lib/book-ai-generate";
import {
  SUPPORTED_SOURCE_DESCRIPTION,
  extractSourceText,
  truncateSourceText,
} from "@/lib/book-source-text";

export const runtime = "nodejs";
export const maxDuration = 60;

const TITLE_MAX_LENGTH = 200;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Expected multipart/form-data with a 'title' field." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body." }, { status: 400 });
  }

  const titleField = form.get("title");
  const title = typeof titleField === "string" ? titleField.trim() : "";
  if (!title) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return Response.json(
      { error: `Title is too long (max ${TITLE_MAX_LENGTH} characters).` },
      { status: 400 },
    );
  }

  let source: { filename: string; text: string } | undefined;
  const sourceField = form.get("source");
  if (sourceField instanceof File && sourceField.size > 0) {
    try {
      const extracted = await extractSourceText(sourceField);
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
        error instanceof Error
          ? error.message
          : "Failed to read the source file.";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  try {
    const book = await generateBookContent({ title, source });
    return Response.json({ ok: true, book });
  } catch (error) {
    console.error("AI book generation failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "AI generation failed. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  }
}
