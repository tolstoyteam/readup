import "server-only";

import type {
  GutenbergImportItemRecord,
  GutenbergImportJobRecord,
  GutenbergImportProgress,
} from "@readup/db";

export function gutenbergImportJobResponse(
  job: GutenbergImportJobRecord,
  items: GutenbergImportItemRecord[],
  progress?: GutenbergImportProgress,
) {
  return {
    id: job.id,
    status: job.status,
    requested_count: job.requestedCount,
    filters: job.filters ?? {},
    progress: progress ?? job.progress,
    last_error: job.lastError,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    items: items.map((item) => ({
      id: item.id,
      gutenberg_id: item.gutenbergId,
      title: item.title,
      author: item.author,
      status: item.status,
      work_id: item.workId,
      generation_job_id: item.generationJobId,
      error: item.error,
      metadata: item.metadata,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    })),
  };
}
