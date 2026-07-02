import type { BookPage, LegacyBookPageElement } from "@readup/db";

function isKeywordsOnlyPage(page: BookPage): boolean {
  return (
    page.elements.length > 0 &&
    page.elements.every((el) => el.type === "keywords")
  );
}

function extractKeywordsFromPage(page: BookPage): string[] {
  const keywords: string[] = [];
  for (const el of page.elements) {
    if (el.type === "keywords") {
      keywords.push(...el.content);
    }
  }
  return keywords;
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const kw of keywords) {
    const trimmed = kw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/**
 * Embeds book keywords into the last chapter page instead of a standalone page.
 * Strips legacy keywords-only pages and merges column/argument keywords.
 */
export function embedKeywordsInLastChapter(
  pages: BookPage[],
  keywords?: string[] | null,
): BookPage[] {
  if (pages.length === 0) return pages;

  const collected: string[] = [];
  if (keywords) {
    collected.push(...keywords);
  }

  const contentPages: BookPage[] = [];
  for (const page of pages) {
    if (isKeywordsOnlyPage(page)) {
      collected.push(...extractKeywordsFromPage(page));
      continue;
    }
    contentPages.push(page);
  }

  if (contentPages.length === 0) return pages;

  const mergedKeywords = dedupeKeywords(collected);
  if (mergedKeywords.length === 0) return contentPages;

  const lastIndex = contentPages.length - 1;
  const lastPage = contentPages[lastIndex];

  if (lastPage.elements.some((el) => el.type === "keywords")) {
    return contentPages;
  }

  const keywordsElement: LegacyBookPageElement = {
    type: "keywords",
    content: mergedKeywords,
  };

  return [
    ...contentPages.slice(0, lastIndex),
    {
      ...lastPage,
      elements: [...lastPage.elements, keywordsElement],
    },
  ];
}
