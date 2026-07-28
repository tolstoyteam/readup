import "server-only";

import type { GenerationJobRecord } from "@readup/db";
import type {
  BookGenerationJobPayload,
  GenerationJobProgress,
  GenerationJobResult,
} from "./types";

export function generationJobResponse(job: GenerationJobRecord) {
  const payload = (job.payload ?? {}) as BookGenerationJobPayload;
  const progress = (payload.progress ?? null) as GenerationJobProgress | null;
  const result = (payload.result ?? null) as GenerationJobResult | null;

  return {
    id: job.id,
    work_id: job.workId,
    type: job.type,
    status: job.status,
    attempt_count: job.attemptCount,
    last_error: job.lastError,
    progress,
    heartbeat_at: payload.heartbeat_at ?? null,
    result,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}
