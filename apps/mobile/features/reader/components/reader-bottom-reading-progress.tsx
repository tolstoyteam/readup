import type { BookDocument } from "@readup/db";
import { ReaderBottomBookProgress } from "@/features/reader/components/reader-bottom-book-progress";

export function ReaderBottomReadingProgress({
  document,
  pageProgress,
}: {
  document: BookDocument;
  pageProgress: number;
}) {
  return <ReaderBottomBookProgress document={document} progress={pageProgress} />;
}
