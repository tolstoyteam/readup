import "server-only";

import { randomUUID } from "node:crypto";
import { languageLabel } from "@/lib/book-language";
import { deleteOrphanTtsChunks } from "@/lib/book-audio-storage";
import {
  claimGenerationJobLease,
  createEditionForWork,
  getBookWithContent,
  getEditionByWorkLanguage,
  patchClaimedGenerationJob,
  releaseGenerationJobLease,
  updateBookTtsAudio,
  updateBookTtsAudioProgress,
  updateEditionGenerationMetadata,
  updateEditionStatus,
} from "@/lib/book-relational";
import { mergeBookTtsPart, nextMissingTtsChunkIndex } from "@/lib/book-tts-audio";
import {
  getBookTtsChunks,
  synthesizeBookTtsChunk,
} from "@/lib/book-tts-synthesize";
import { getBookAudioBucket } from "@/lib/supabase-storage";
import { withExponentialBackoff } from "@/lib/retry";
import { generateEnglishBook } from "./generate-english";
import { buildGenerationMetadata, settingsFromWorkflow } from "./metadata";
import { translateBookEdition } from "./translate-edition";
import { SOURCE_LANGUAGE } from "./constants";
import {
  normalizeWorkflowLanguages,
  type BookGenerationJobPayload,
  type GenerationJobProgress,
} from "./types";

const STEP_LEASE_MS = 5.5 * 60 * 1000;

export type AdvanceBookGenerationResult =
  | { kind: "advanced" | "terminal" }
  | { kind: "busy"; retryAfterMs: number }
  | { kind: "not_found" };

function progress(step: string, message: string, extra: Partial<GenerationJobProgress> = {}) {
  return { step, message, ...extra };
}

function warningsWithoutLanguage(
  warnings: { language: string; error: string }[],
  language: string,
) {
  return warnings.filter((warning) => warning.language !== language);
}

async function updateProgress(
  jobId: string,
  leaseToken: string,
  nextProgress: GenerationJobProgress,
): Promise<void> {
  const updated = await patchClaimedGenerationJob(jobId, leaseToken, {
    progress: nextProgress,
  });
  if (!updated) {
    throw new Error("Generation step lease was lost.");
  }
}

async function releaseStep(args: {
  jobId: string;
  leaseToken: string;
  nextProgress: GenerationJobProgress;
  payloadPatch?: Partial<BookGenerationJobPayload>;
}): Promise<void> {
  const released = await releaseGenerationJobLease({
    jobId: args.jobId,
    leaseToken: args.leaseToken,
    status: "running",
    error: null,
    payloadPatch: {
      ...args.payloadPatch,
      progress: args.nextProgress,
    },
  });
  if (!released) {
    throw new Error("Generation step completed after its lease was lost.");
  }
}

async function failStep(
  jobId: string,
  leaseToken: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Book generation failed.";
  const released = await releaseGenerationJobLease({
    jobId,
    leaseToken,
    status: "failed",
    error: message,
    payloadPatch: {
      progress: progress("error", message),
    },
  });
  if (!released) {
    console.error("[book_generation] could not record failed step after lease loss", {
      jobId,
      message,
    });
  }
}

export async function advanceBookGenerationJob(
  jobId: string,
): Promise<AdvanceBookGenerationResult> {
  const leaseToken = randomUUID();
  const claim = await claimGenerationJobLease({
    jobId,
    lease: {
      token: leaseToken,
      expires_at: new Date(Date.now() + STEP_LEASE_MS).toISOString(),
    },
  });

  if (claim.kind === "not_found") return { kind: "not_found" };
  if (claim.kind === "busy") {
    return { kind: "busy", retryAfterMs: claim.retryAfterMs };
  }
  if (claim.kind === "terminal") return { kind: "terminal" };

  const job = claim.job;
  const payload = job.payload as BookGenerationJobPayload;

  try {
    if (job.type !== "book_generation" || !payload.workflow_settings) {
      throw new Error("Invalid book-generation job payload.");
    }

    const settings = payload.workflow_settings;
    const allLanguages = normalizeWorkflowLanguages(settings.languages);
    const additionalLanguages = allLanguages.filter((language) => language !== SOURCE_LANGUAGE);
    const generationSettings = settingsFromWorkflow({
      topic: settings.topic,
      reading_level: settings.reading_level,
      length: settings.length,
      include_quiz: settings.include_quiz,
    });

    let english = await getEditionByWorkLanguage(job.workId, SOURCE_LANGUAGE);
    if (!english) {
      await updateProgress(
        jobId,
        leaseToken,
        progress("generating_english", "Generating English book..."),
      );
      const draft = await generateEnglishBook({
        settings: generationSettings,
        includeQuiz: settings.include_quiz,
        source: payload.source,
      });
      const metadata = buildGenerationMetadata({
        settings: {
          ...generationSettings,
          genres: draft.content.genres,
        },
        generatedLanguages: allLanguages,
        subtitle: draft.subtitle,
        description: draft.description,
      });
      english = await createEditionForWork({
        workId: job.workId,
        input: {
          ...draft.content,
          cover_image_url: payload.cover_path ?? undefined,
        },
        status: "generating_tts",
        generationMetadata: metadata,
      });
      await releaseStep({
        jobId,
        leaseToken,
        nextProgress: progress("saving_english", "English edition saved."),
      });
      return { kind: "advanced" };
    }

    const warnings = payload.warnings ?? [];
    for (const language of additionalLanguages) {
      const existing = await getEditionByWorkLanguage(job.workId, language);
      const previousFailure = warnings.find((warning) => warning.language === language);
      if (existing || previousFailure) continue;

      await updateProgress(
        jobId,
        leaseToken,
        progress("translating", `Translating to ${languageLabel(language)}...`, {
          language,
        }),
      );

      try {
        const translated = await withExponentialBackoff(
          () =>
            translateBookEdition({
              source: english,
              targetLanguage: language,
            }),
          { maxAttempts: 3, label: `translate-${language}` },
        );
        const edition = await createEditionForWork({
          workId: job.workId,
          input: translated.content,
          status: "generating_tts",
          sourceEditionId: english.id,
          generationMetadata: translated.metadata,
        });
        if (translated.metadata) {
          await updateEditionGenerationMetadata(edition.id, translated.metadata);
        }
        await releaseStep({
          jobId,
          leaseToken,
          nextProgress: progress(
            "translating",
            `${languageLabel(language)} translation saved.`,
            { language, edition_id: edition.id },
          ),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Translation to ${language} failed.`;
        const nextWarnings = [
          ...warningsWithoutLanguage(warnings, language),
          { language, error: message },
        ];
        const failedEdition = await getEditionByWorkLanguage(job.workId, language);
        if (failedEdition) {
          await updateEditionStatus(
            failedEdition.id,
            "failed",
            "translationError",
            message,
          );
        }
        await releaseStep({
          jobId,
          leaseToken,
          nextProgress: progress(
            "translating",
            `${languageLabel(language)} translation failed; continuing.`,
            { language },
          ),
          payloadPatch: { warnings: nextWarnings },
        });
      }
      return { kind: "advanced" };
    }

    const editions = (
      await Promise.all(
        allLanguages.map(async (language) => {
          const edition = await getEditionByWorkLanguage(job.workId, language);
          return edition ? { language, edition } : null;
        }),
      )
    ).filter(
      (
        item,
      ): item is {
        language: string;
        edition: NonNullable<Awaited<ReturnType<typeof getBookWithContent>>>;
      } => item !== null,
    );

    for (const { language, edition: initialEdition } of editions) {
      const edition = (await getBookWithContent(initialEdition.id)) ?? initialEdition;
      const chunks = getBookTtsChunks(edition);
      if (chunks.length === 0) {
        throw new Error(`No readable text to synthesize for ${languageLabel(language)}.`);
      }

      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const bucket = getBookAudioBucket();
      if (!apiKey || !bucket) {
        if (edition.status !== "published") {
          await updateEditionStatus(edition.id, "published");
          await releaseStep({
            jobId,
            leaseToken,
            nextProgress: progress(
              "generating_tts",
              `Audio skipped for ${languageLabel(language)}; edition published.`,
              { language, edition_id: edition.id },
            ),
          });
          return { kind: "advanced" };
        }
        continue;
      }

      const chunkIndex = nextMissingTtsChunkIndex(edition.ttsAudio ?? undefined, chunks.length);
      if (chunkIndex !== null) {
        await updateProgress(
          jobId,
          leaseToken,
          progress(
            "generating_tts",
            `Generating audio (${languageLabel(language)}) part ${chunkIndex + 1}/${chunks.length}...`,
            {
              language,
              edition_id: edition.id,
              chunk: chunkIndex,
            },
          ),
        );
        const generated = await synthesizeBookTtsChunk({
          book: edition,
          apiKey,
          chunkIndex,
        });
        const nextAudio = mergeBookTtsPart(
          edition.ttsAudio ?? undefined,
          chunkIndex,
          generated.paths,
        );
        await updateBookTtsAudioProgress(edition.id, nextAudio);
        await releaseStep({
          jobId,
          leaseToken,
          nextProgress: progress(
            "generating_tts",
            `Audio saved (${languageLabel(language)}) part ${chunkIndex + 1}/${chunks.length}.`,
            {
              language,
              edition_id: edition.id,
              chunk: chunkIndex,
            },
          ),
        });
        return { kind: "advanced" };
      }

      if (!edition.ttsAudio) {
        throw new Error(`TTS metadata is missing for ${languageLabel(language)}.`);
      }
      if (edition.status !== "published") {
        await deleteOrphanTtsChunks(String(edition.id), chunks.length - 1);
        await updateBookTtsAudio(edition.id, edition.ttsAudio);
        await releaseStep({
          jobId,
          leaseToken,
          nextProgress: progress(
            "generating_tts",
            `${languageLabel(language)} audio completed.`,
            { language, edition_id: edition.id },
          ),
        });
        return { kind: "advanced" };
      }
    }

    const result = {
      work_id: job.workId,
      editions: editions.map(({ language, edition }) => ({
        language,
        id: edition.id,
      })),
      ...(warnings.length > 0 ? { warnings } : {}),
    };
    const released = await releaseGenerationJobLease({
      jobId,
      leaseToken,
      status: "succeeded",
      error: null,
      payloadPatch: {
        result,
        warnings,
        progress: progress("completed", "Book generation finished."),
      },
    });
    if (!released) {
      throw new Error("Book generation completed after its lease was lost.");
    }
    return { kind: "advanced" };
  } catch (error) {
    console.error("[book_generation] resumable step failed", {
      jobId,
      error,
    });
    await failStep(jobId, leaseToken, error);
    return { kind: "advanced" };
  }
}
