import { useEffect, useMemo, useState } from "react";

import { useLibraryContext } from "@/features/library/context/library-provider";
import { resolveWorkId } from "@/features/library/lib/resolve-work-id";

export function useLibraryBook(bookId: string) {
  const { recordsByBookId, recordsByWorkId, loading, registerEditionMapping } =
    useLibraryContext();
  const [resolvedWorkId, setResolvedWorkId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setResolvedWorkId(null);
      return;
    }
    const direct = recordsByBookId.get(bookId);
    if (direct) {
      registerEditionMapping(bookId, direct.workId);
      setResolvedWorkId(direct.workId);
      return;
    }
    let cancelled = false;
    void resolveWorkId(bookId).then((workId) => {
      if (cancelled) return;
      if (workId) {
        registerEditionMapping(bookId, workId);
        setResolvedWorkId(workId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, recordsByBookId, registerEditionMapping]);

  const record = useMemo(() => {
    if (!bookId) return null;
    const byBook = recordsByBookId.get(bookId);
    if (byBook) return byBook;
    if (resolvedWorkId) {
      return recordsByWorkId.get(resolvedWorkId) ?? null;
    }
    return null;
  }, [bookId, recordsByBookId, recordsByWorkId, resolvedWorkId]);

  return { record, loading, isSaved: record?.isSaved === true };
}
