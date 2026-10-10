import type { GutenbergImportCoverState } from "@readup/db";
import { sanitizeCoverError } from "./cover-prompt";

export type CoverBytes = {
  buffer: Buffer;
  mime: string;
  extension: string;
};

export type EnsureAiWorkCoverArgs = {
  workId: string;
  title: string;
  author: string;
  subjects?: string[];
  onStatus?: (cover: GutenbergImportCoverState) => Promise<void>;
};

export type EnsureAiWorkCoverResult =
  | {
      ok: true;
      path: string;
      cover: GutenbergImportCoverState;
    }
  | {
      ok: false;
      cover: GutenbergImportCoverState;
    };

export type CoverEnsureDeps = {
  getWorkCoverPath: (workId: string) => Promise<string | null>;
  generate: (args: {
    title: string;
    author: string;
    subjects?: string[];
  }) => Promise<Buffer>;
  normalize: (buffer: Buffer) => Promise<CoverBytes>;
  upload: (workId: string, cover: CoverBytes) => Promise<string>;
  persist: (workId: string, path: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
};

async function report(
  onStatus: EnsureAiWorkCoverArgs["onStatus"],
  cover: GutenbergImportCoverState,
): Promise<void> {
  if (!onStatus) return;
  try {
    await onStatus(cover);
  } catch (error) {
    console.warn("[cover_ensure] onStatus failed", {
      status: cover.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Ensure a work has an AI-generated cover stored like manual uploads.
 * Skips generation when a valid cover path already exists on the work.
 * Never throws for expected generation/storage failures — returns ok:false.
 */
export async function ensureAiWorkCoverWithDeps(
  args: EnsureAiWorkCoverArgs,
  deps: CoverEnsureDeps,
): Promise<EnsureAiWorkCoverResult> {
  const existing = await deps.getWorkCoverPath(args.workId);
  if (existing) {
    const cover: GutenbergImportCoverState = {
      status: "skipped",
      path: existing,
      error: null,
      stage: "exists",
    };
    await report(args.onStatus, cover);
    return { ok: true, path: existing, cover };
  }

  let uploadedPath: string | null = null;
  let stage: string = "generate";

  try {
    await report(args.onStatus, {
      status: "generating",
      error: null,
      stage: "generate",
      path: null,
    });

    stage = "generate";
    const raw = await deps.generate({
      title: args.title,
      author: args.author,
      subjects: args.subjects,
    });

    stage = "normalize";
    await report(args.onStatus, {
      status: "uploading",
      error: null,
      stage: "normalize",
      path: null,
    });

    const normalized = await deps.normalize(raw);

    stage = "upload";
    await report(args.onStatus, {
      status: "uploading",
      error: null,
      stage: "upload",
      path: null,
    });

    uploadedPath = await deps.upload(args.workId, normalized);

    stage = "persist";
    await report(args.onStatus, {
      status: "uploading",
      error: null,
      stage: "persist",
      path: uploadedPath,
    });

    try {
      await deps.persist(args.workId, uploadedPath);
    } catch (persistError) {
      await deps.remove(uploadedPath);
      uploadedPath = null;
      throw persistError;
    }

    const cover: GutenbergImportCoverState = {
      status: "completed",
      error: null,
      stage: "persist",
      path: uploadedPath,
    };
    await report(args.onStatus, cover);
    return { ok: true, path: uploadedPath, cover };
  } catch (error) {
    const cover: GutenbergImportCoverState = {
      status: "failed",
      error: sanitizeCoverError(error),
      stage,
      path: null,
    };
    await report(args.onStatus, cover);
    console.warn("[cover_ensure] failed", {
      workId: args.workId,
      stage,
      error: cover.error,
    });
    return { ok: false, cover };
  }
}

export function isCoverAttemptInFlight(
  cover: GutenbergImportCoverState | null | undefined,
): boolean {
  if (!cover) return false;
  return cover.status === "generating" || cover.status === "uploading";
}
