export { LibraryProvider, useLibraryContext } from "@/features/library/context/library-provider";
export { useLibrary } from "@/features/library/hooks/use-library";
export { useLibraryBook } from "@/features/library/hooks/use-library-book";
export { useLibraryActions } from "@/features/library/hooks/use-library-actions";
export type { LibrarySection } from "@/features/library/lib/library-types";
export type { LibraryBookCard } from "@/features/library/lib/join-library-books";
export {
  buildBookCatalogMap,
  joinLibraryBooks,
} from "@/features/library/lib/join-library-books";
export {
  getContinueBookRecord,
  dedupeByWorkId,
  isCompleted,
  isInProgress,
  isSaved,
  progressPercentage,
} from "@/features/library/lib/library-semantics";
export type {
  LibraryProgress,
  ReadingStatus,
  UserBookRecord,
  WorkLibraryProgress,
} from "@/features/library/lib/library-types";
