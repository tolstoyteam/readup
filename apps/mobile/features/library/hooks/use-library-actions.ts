import { useCallback } from "react";

import { useLibraryContext } from "@/features/library/context/library-provider";

export function useLibraryActions() {
  const { toggleSave, recordReadingSession, refresh } = useLibraryContext();

  const toggleSaveBook = useCallback(
    async (bookId: string) => {
      await toggleSave(bookId);
    },
    [toggleSave],
  );

  return {
    toggleSave: toggleSaveBook,
    recordReadingSession,
    refresh,
  };
}
