import { z } from "zod";
import {
  BOOK_LENGTHS,
  READING_LEVELS,
  type BookGenerationMetadata,
  type BookGenerationSettings,
  type BookLength,
  type ReadingLevel,
} from "@readup/db";
import type { BookContentInput } from "@/lib/book-content";

export { BOOK_LENGTHS, READING_LEVELS };
export type { BookGenerationMetadata, BookGenerationSettings, BookLength, ReadingLevel };

import { SOURCE_LANGUAGE } from "./constants";

export { SOURCE_LANGUAGE };

export const workflowSettingsSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  reading_level: z.enum(READING_LEVELS),
  length: z.enum(BOOK_LENGTHS).default("medium"),
  languages: z.array(z.string().min(2).max(32)).default([]),
  include_quiz: z.boolean().default(true),
});

export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>;

export type GeneratedEnglishDraft = {
  content: BookContentInput;
  subtitle?: string;
  description?: string;
};

export type GenerationJobProgress = {
  step: string;
  message: string;
  language?: string;
  edition_id?: number;
  chunk?: number;
  voice?: string;
};

export type GenerationJobResult = {
  work_id: string;
  editions: { language: string; id: number }[];
  warnings?: { language: string; error: string }[];
};

export type GenerationJobLease = {
  token: string;
  expires_at: string;
};

export type BookGenerationJobPayload = {
  workflow_settings: WorkflowSettings;
  source?: { filename: string; text: string };
  cover_path?: string | null;
  progress?: GenerationJobProgress | null;
  heartbeat_at?: string | null;
  result?: GenerationJobResult | null;
  warnings?: { language: string; error: string }[];
  lease?: GenerationJobLease | null;
};

export function normalizeWorkflowLanguages(languages: string[]): string[] {
  const additional = languages
    .map((code) => code.trim().toLowerCase())
    .filter((code) => code && code !== SOURCE_LANGUAGE && code !== "other");
  return [SOURCE_LANGUAGE, ...[...new Set(additional)]];
}

export function parseWorkflowSettings(input: unknown):
  | { ok: true; data: WorkflowSettings }
  | { ok: false; message: string } {
  const parsed = workflowSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: first ? `${first.path.join(".") || "settings"}: ${first.message}` : "Invalid settings",
    };
  }
  return { ok: true, data: parsed.data };
}
