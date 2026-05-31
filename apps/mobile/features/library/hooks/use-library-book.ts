import { useMemo } from "react";

import { useLibraryContext } from "@/features/library/context/library-provider";

export function useLibraryBook(bookId: string) {
  const { recordsByBookId, loading } = useLibraryContext();
  const record = useMemo(
    () => (bookId ? recordsByBookId.get(bookId) ?? null : null),
    [bookId, recordsByBookId],
  );
  return { record, loading, isSaved: record?.isSaved === true };
}
