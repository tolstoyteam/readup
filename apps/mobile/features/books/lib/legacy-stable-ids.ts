import type { BookPage, LegacyBookPageElement } from "@readup/db/shared";

export function legacyChapterStableId(
  bookId: string,
  pageNumber: number,
): string {
  return `legacy:${bookId}:${pageNumber}`;
}

export function legacyBlockStableId(
  bookId: string,
  pageNumber: number,
  elementIndex: number,
): string {
  return `legacy:${bookId}:${pageNumber}:${elementIndex}`;
}

function isSelectableElement(
  element: LegacyBookPageElement,
): element is Extract<LegacyBookPageElement, { type: "text" | "quote" }> {
  return element.type === "text" || element.type === "quote";
}

/**
 * Assigns deterministic stable IDs to legacy JSON pages that lack relational anchors.
 */
export function assignLegacyStableIds(
  pages: BookPage[],
  bookId: string,
): BookPage[] {
  return pages.map((page) => {
    const pageNumber = page.page_number;
    const chapterStableId =
      page.chapter_stable_id ?? legacyChapterStableId(bookId, pageNumber);

    const elements = page.elements.map((element, elementIndex) => {
      if (!isSelectableElement(element)) {
        return element;
      }
      if (element.block_stable_id) {
        return element;
      }
      return {
        ...element,
        block_stable_id: legacyBlockStableId(bookId, pageNumber, elementIndex),
      };
    });

    return {
      ...page,
      chapter_stable_id: chapterStableId,
      elements,
    };
  });
}
