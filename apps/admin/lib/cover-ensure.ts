import "server-only";

import { eq } from "drizzle-orm";
import { bookWorksTable } from "@readup/db";
import { db } from "@/db/client";
import {
  type EnsureAiWorkCoverArgs,
  type EnsureAiWorkCoverResult,
} from "@/lib/cover-ensure-core";
import { ensureCoverDraft, generateCoverSource, getCoverDesign, publishCover } from "@/lib/cover-design-service";
import { sanitizeCoverError } from "@/lib/cover-prompt";

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
  async function report(cover: EnsureAiWorkCoverResult["cover"]) {
    try { await args.onStatus?.(cover); }
    catch (error) { console.warn("[cover_ensure] status update failed", error); }
  }
  let stage = "lookup";
  try {
    const existing = await getWorkCoverPath(args.workId);
    if (existing) {
      const cover = { status: "skipped" as const, path: existing, error: null, stage: "exists" };
      await report(cover);
      return { ok: true, path: existing, cover };
    }
    stage = "draft";
    await ensureCoverDraft({ workId: args.workId, title: args.title, author: args.author,
      subjects: args.subjects, bookshelves: args.bookshelves });
    let design = await getCoverDesign(args.workId);
    if (!design?.hasSource) {
      stage = "generate";
      await report({ status: "generating", error: null, stage, path: null });
      await generateCoverSource(args.workId, args);
      design = await getCoverDesign(args.workId);
    }
    stage = "publish";
    await report({ status: "uploading", error: null, stage, path: null });
    const path = await publishCover(args.workId, design!.revision, null);
    const cover = { status: "completed" as const, error: null, stage, path };
    await report(cover);
    return { ok: true, path, cover };
  } catch (error) {
    const cover = { status: "failed" as const, error: sanitizeCoverError(error), stage, path: null };
    await report(cover);
    return { ok: false, cover };
  }
}
