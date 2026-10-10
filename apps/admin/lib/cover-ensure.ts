import "server-only";

import { eq } from "drizzle-orm";
import { bookWorksTable } from "@readup/db";
import { db } from "@/db/client";
import { updateWorkCover } from "@/lib/book-relational";
import { generateBookCoverImage } from "@/lib/cover-generate";
import {
  ensureAiWorkCoverWithDeps,
  type EnsureAiWorkCoverArgs,
  type EnsureAiWorkCoverResult,
} from "@/lib/cover-ensure-core";
import { normalizeCoverImage } from "@/lib/cover-normalize";
import { removeCoverFromStorage, uploadWorkCover } from "@/lib/cover-storage";

export type {
  CoverEnsureDeps,
  EnsureAiWorkCoverArgs,
  EnsureAiWorkCoverResult,
} from "@/lib/cover-ensure-core";
export {
  ensureAiWorkCoverWithDeps,
  isCoverAttemptInFlight,
} from "@/lib/cover-ensure-core";

export async function getWorkCoverPath(workId: string): Promise<string | null> {
  const [row] = await db
    .select({ coverImageUrl: bookWorksTable.coverImageUrl })
    .from(bookWorksTable)
    .where(eq(bookWorksTable.id, workId))
    .limit(1);
  const path = row?.coverImageUrl?.trim();
  return path || null;
}

export async function ensureAiWorkCover(
  args: EnsureAiWorkCoverArgs,
): Promise<EnsureAiWorkCoverResult> {
  return ensureAiWorkCoverWithDeps(args, {
    getWorkCoverPath,
    generate: generateBookCoverImage,
    normalize: normalizeCoverImage,
    upload: uploadWorkCover,
    persist: updateWorkCover,
    remove: removeCoverFromStorage,
  });
}
