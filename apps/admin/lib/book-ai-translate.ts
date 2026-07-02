import "server-only";

import type { BookContentInput } from "@/lib/book-content";
import type { BookWithContent } from "@/lib/book-relational";
import { translateBookEdition as translateEdition } from "@/lib/book-generation/translate-edition";

export async function translateBookEdition(args: {
  source: BookWithContent;
  targetLanguage: string;
}): Promise<BookContentInput> {
  const result = await translateEdition(args);
  return result.content;
}
