import type { WorkLibraryProgress } from "@readup/db";

export type BookPageWithStableId = {
  page_number: number;
  chapter_stable_id?: string;
};

export function resolvePageIndex(
  progress: WorkLibraryProgress | null | undefined,
  pages: BookPageWithStableId[],
): number {
  if (pages.length === 0) return 0;

  const canonical = progress?.canonical_position;
  const chapterStableId =
    canonical?.chapter_stable_id ?? progress?.chapter_stable_id;

  if (chapterStableId) {
    const byStableId = pages.findIndex(
      (page) => page.chapter_stable_id === chapterStableId,
    );
    if (byStableId >= 0) return byStableId;
  }

  const savedPage = canonical?.page ?? progress?.page ?? 0;
  if (savedPage <= 0) return 0;
  const byPageNumber = pages.findIndex((p) => p.page_number === savedPage);
  if (byPageNumber >= 0) return byPageNumber;
  return Math.min(Math.max(savedPage - 1, 0), pages.length - 1);
}
