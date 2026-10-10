import { z } from "zod";

export const gutenbergImportRequestSchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(1),
  genre: z.string().trim().max(200).optional(),
  author: z.string().trim().max(200).optional(),
  year: z.coerce.number().int().min(-3000).max(2100).optional(),
});

export type GutenbergImportRequest = z.infer<typeof gutenbergImportRequestSchema>;

function emptyToUndefined(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}

export function parseGutenbergImportRequest(input: unknown):
  | { ok: true; data: GutenbergImportRequest }
  | { ok: false; message: string } {
  const raw =
    input && typeof input === "object"
      ? {
          ...(input as Record<string, unknown>),
          genre: emptyToUndefined((input as Record<string, unknown>).genre),
          author: emptyToUndefined((input as Record<string, unknown>).author),
          year: emptyToUndefined((input as Record<string, unknown>).year),
        }
      : input;

  const parsed = gutenbergImportRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: first
        ? `${first.path.join(".") || "request"}: ${first.message}`
        : "Invalid import request",
    };
  }

  const data = {
    count: parsed.data.count,
    genre: parsed.data.genre?.trim() || undefined,
    author: parsed.data.author?.trim() || undefined,
    year: parsed.data.year,
  };
  return { ok: true, data };
}
