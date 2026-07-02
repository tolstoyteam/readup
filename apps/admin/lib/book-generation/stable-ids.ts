import { randomUUID } from "node:crypto";
import type { BookContentInput } from "@/lib/book-content";

/** Assign stable UUIDs to every chapter and block for cross-language alignment. */
export function assignStableIds(input: BookContentInput): BookContentInput {
  return {
    ...input,
    chapters: input.chapters.map((chapter) => ({
      ...chapter,
      id: chapter.id ?? randomUUID(),
      blocks: chapter.blocks.map((block) => ({
        ...block,
        id: block.id ?? randomUUID(),
      })),
    })),
  };
}
