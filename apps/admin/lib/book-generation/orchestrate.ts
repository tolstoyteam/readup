import "server-only";

import { languageLabel } from "@/lib/book-language";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import { type ParsedCover, uploadWorkCover } from "@/lib/cover-storage";
import {
  createEditionForWork,
  getBookWithContent,
  getEditionByWorkLanguage,
  getGenerationJob,
  markGenerationJobRunning,
  replaceBookContent,
  updateEditionGenerationMetadata,
  updateEditionStatus,
  updateGenerationJob,
  updateGenerationJobProgress,
  updateWorkCover,
} from "@/lib/book-relational";
import { withExponentialBackoff } from "@/lib/retry";
import { generateEnglishBook } from "./generate-english";
import { buildGenerationMetadata, settingsFromWorkflow } from "./metadata";
import { translateBookEdition } from "./translate-edition";
import { SOURCE_LANGUAGE } from "./constants";
import {
  normalizeWorkflowLanguages,
  type BookGenerationJobPayload,
  type ProgressCallback,
  type WorkflowSettings,
} from "./types";

export async function runBookGenerationWorkflowForJob(jobId: string): Promise<void> {
  const job = await getGenerationJob(jobId);
  if (!job) {
    console.error("[book_generation] job not found", jobId);
    return;
  }
  if (job.status !== "queued") {
    console.warn("[book_generation] skipping job — not queued", jobId, job.status);
    return;
  }

  const payload = job.payload as BookGenerationJobPayload;
  if (!payload?.workflow_settings) {
    await updateGenerationJob(jobId, "failed", "Invalid job payload: missing workflow_settings.");
    return;
  }

  const onProgress = createJobProgressReporter(jobId, () => {});

  try {
    await markGenerationJobRunning(jobId);
    await runBookGenerationWorkflow({
      settings: payload.workflow_settings,
      source: payload.source,
      coverPath: payload.cover_path ?? undefined,
      workId: job.workId,
      jobId,
      onProgress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book generation failed.";
    console.error("[book_generation] job failed", { jobId, message, error });
    await updateGenerationJob(jobId, "failed", message, {
      progress: { step: "error", message },
      heartbeat_at: new Date().toISOString(),
    });
  }
}

function createJobProgressReporter(
  jobId: string,
  onProgress: ProgressCallback,
): ProgressCallback {
  return (event) => {
    onProgress(event);
    if (event.step === "error" || event.step === "completed") return;

    void updateGenerationJobProgress(jobId, {
      step: event.step,
      message: event.message,
      language: "language" in event ? event.language : undefined,
      edition_id: "edition_id" in event ? event.edition_id : undefined,
      chunk: "chunk" in event ? event.chunk : undefined,
      voice: "voice" in event ? event.voice : undefined,
    });
  };
}

export async function runBookGenerationWorkflow(args: {
  settings: WorkflowSettings;
  source?: { filename: string; text: string };
  cover?: ParsedCover | null;
  coverPath?: string;
  workId: string;
  jobId: string;
  onProgress: ProgressCallback;
}): Promise<{
  workId: string;
  editions: { language: string; id: number }[];
  warnings: { language: string; error: string }[];
}> {
  const { settings, source, cover, coverPath: initialCoverPath, workId, jobId, onProgress } = args;
  const generationSettings = settingsFromWorkflow({
    topic: settings.topic,
    reading_level: settings.reading_level,
    length: settings.length,
    include_quiz: settings.include_quiz,
  });
  const allLanguages = normalizeWorkflowLanguages(settings.languages);
  const additionalLanguages = allLanguages.filter((lang) => lang !== SOURCE_LANGUAGE);

  onProgress({ step: "generating_english", message: "Generating English book..." });

  let englishDraft;
  try {
    englishDraft = await generateEnglishBook({
      settings: generationSettings,
      includeQuiz: settings.include_quiz,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "English generation failed.";
    onProgress({ step: "error", message });
    throw new Error(message);
  }

  onProgress({ step: "saving_english", message: "Saving..." });

  const settingsWithInferredGenre = {
    ...generationSettings,
    genres: englishDraft.content.genres,
  };

  try {
    let coverPath = initialCoverPath;
    if (!coverPath && cover) {
      coverPath = await uploadWorkCover(workId, cover);
      await updateWorkCover(workId, coverPath);
    }

    const englishMetadata = buildGenerationMetadata({
      settings: settingsWithInferredGenre,
      generatedLanguages: allLanguages,
      subtitle: englishDraft.subtitle,
      description: englishDraft.description,
    });

    const englishEdition = await createEditionForWork({
      workId,
      input: {
        ...englishDraft.content,
        cover_image_url: coverPath,
      },
      status: "generating_tts",
      generationMetadata: englishMetadata,
    });

    const englishLoaded = (await getBookWithContent(englishEdition.id)) ?? englishEdition;
    const warnings: { language: string; error: string }[] = [];
    const editions: { language: string; id: number }[] = [
      { language: SOURCE_LANGUAGE, id: englishLoaded.id },
    ];

    if (additionalLanguages.length > 0) {
      const translationResults = await Promise.allSettled(
        additionalLanguages.map(async (language) => {
          onProgress({
            step: "translating",
            language,
            message: `Translating to ${languageLabel(language)}...`,
          });

          const translated = await withExponentialBackoff(
            () =>
              translateBookEdition({
                source: englishLoaded,
                targetLanguage: language,
              }),
            { maxAttempts: 3, label: `translate-${language}` },
          );

          const existing = await getEditionByWorkLanguage(workId, language);
          const edition = existing
            ? await replaceBookContent(existing.id, translated.content)
            : await createEditionForWork({
                workId,
                input: translated.content,
                status: "generating_tts",
                sourceEditionId: englishLoaded.id,
                generationMetadata: translated.metadata,
              });

          if (!edition) {
            throw new Error(`Could not save ${language} edition.`);
          }

          if (translated.metadata) {
            await updateEditionGenerationMetadata(edition.id, translated.metadata);
          }

          return { language, id: edition.id };
        }),
      );

      for (let index = 0; index < translationResults.length; index += 1) {
        const result = translationResults[index];
        const language = additionalLanguages[index] ?? "unknown";
        if (result.status === "fulfilled") {
          editions.push(result.value);
        } else {
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : `Translation to ${language} failed.`;
          warnings.push({ language, error: message });
          const failedEdition = await getEditionByWorkLanguage(workId, language);
          if (failedEdition) {
            await updateEditionStatus(failedEdition.id, "failed", "translationError", message);
          }
          console.error(`Translation failed for ${language}:`, result.reason);
        }
      }
    }

    const sortedEditions = [...editions].sort((a, b) => {
      if (a.language === SOURCE_LANGUAGE) return -1;
      if (b.language === SOURCE_LANGUAGE) return 1;
      return a.language.localeCompare(b.language);
    });

    for (const edition of sortedEditions) {
      const loaded = await getBookWithContent(edition.id);
      if (!loaded) {
        throw new Error(`Could not load edition ${edition.id} (${edition.language}) for TTS.`);
      }

      onProgress({
        step: "generating_tts",
        language: edition.language,
        edition_id: edition.id,
        message: `Generating audio (${languageLabel(edition.language)})...`,
      });

      await finalizeBookTtsForBook(loaded, {
        throwOnError: true,
        onProgress: ({ chunkIndex, chunkCount, voice }) => {
          onProgress({
            step: "generating_tts",
            language: edition.language,
            edition_id: edition.id,
            chunk: chunkIndex,
            voice,
            message: `Generating audio (${languageLabel(edition.language)}) part ${chunkIndex + 1}/${chunkCount} (${voice})...`,
          });
        },
      });
    }

    const result = {
      work_id: workId,
      editions,
      ...(warnings.length > 0 ? { warnings } : {}),
    };

    await updateGenerationJob(jobId, "succeeded", null, {
      result,
      progress: { step: "completed", message: "Book generation finished." },
      heartbeat_at: new Date().toISOString(),
    });

    onProgress({
      step: "completed",
      work_id: workId,
      editions,
      ...(warnings.length > 0 ? { warnings } : {}),
    });

    return { workId, editions, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book generation failed.";
    await updateGenerationJob(jobId, "failed", message, {
      progress: { step: "error", message },
      heartbeat_at: new Date().toISOString(),
    });
    onProgress({ step: "error", message });
    throw error;
  }
}
