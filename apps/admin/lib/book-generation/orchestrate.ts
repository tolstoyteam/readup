import "server-only";

import { languageLabel } from "@/lib/book-language";
import { finalizeBookTtsForBook } from "@/lib/book-tts-regenerate";
import { type ParsedCover, uploadWorkCover } from "@/lib/cover-storage";
import {
  createBookWork,
  createEditionForWork,
  createGenerationJob,
  getBookWithContent,
  getEditionByWorkLanguage,
  markGenerationJobRunning,
  replaceBookContent,
  updateEditionGenerationMetadata,
  updateEditionStatus,
  updateGenerationJob,
  updateWorkCover,
} from "@/lib/book-relational";
import { generateEnglishBook } from "./generate-english";
import { buildGenerationMetadata, settingsFromWorkflow } from "./metadata";
import { translateBookEdition } from "./translate-edition";
import { SOURCE_LANGUAGE } from "./constants";
import {
  normalizeWorkflowLanguages,
  type ProgressCallback,
  type WorkflowSettings,
} from "./types";

async function withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Operation failed.");
      if (attempt < attempts) {
        console.warn(`Retrying after failure (attempt ${attempt}/${attempts}):`, lastError.message);
      }
    }
  }
  throw lastError ?? new Error("Operation failed.");
}

export async function runBookGenerationWorkflow(args: {
  settings: WorkflowSettings;
  source?: { filename: string; text: string };
  cover?: ParsedCover | null;
  onProgress: ProgressCallback;
}): Promise<{
  workId: string;
  editions: { language: string; id: number }[];
  warnings: { language: string; error: string }[];
}> {
  const { settings, source, cover, onProgress } = args;
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

  const work = await createBookWork();
  const job = await createGenerationJob({
    workId: work.id,
    type: "book_generation",
    payload: {
      topic: settings.topic,
      languages: allLanguages,
      length: settings.length,
      include_quiz: settings.include_quiz,
    },
  });

  try {
    await markGenerationJobRunning(job.id);

    let coverPath: string | undefined;
    if (cover) {
      coverPath = await uploadWorkCover(work.id, cover);
      await updateWorkCover(work.id, coverPath);
    }

    const englishMetadata = buildGenerationMetadata({
      settings: settingsWithInferredGenre,
      generatedLanguages: allLanguages,
      subtitle: englishDraft.subtitle,
      description: englishDraft.description,
    });

    const englishEdition = await createEditionForWork({
      workId: work.id,
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

          const translated = await withRetry(
            () =>
              translateBookEdition({
                source: englishLoaded,
                targetLanguage: language,
              }),
            2,
          );

          const existing = await getEditionByWorkLanguage(work.id, language);
          const edition = existing
            ? await replaceBookContent(existing.id, translated.content)
            : await createEditionForWork({
                workId: work.id,
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
          const failedEdition = await getEditionByWorkLanguage(work.id, language);
          if (failedEdition) {
            await updateEditionStatus(failedEdition.id, "failed", "translationError", message);
          }
          console.error(`Translation failed for ${language}:`, result.reason);
        }
      }
    }

    const ttsTargets = await Promise.all(
      editions.map(async (edition) => {
        const loaded = await getBookWithContent(edition.id);
        return loaded ? { language: edition.language, book: loaded } : null;
      }),
    );

    await Promise.all(
      ttsTargets.map(async (target) => {
        if (!target) return;
        onProgress({
          step: "generating_tts",
          language: target.language,
          message: `Generating audio (${languageLabel(target.language)})...`,
        });
        const tts = await finalizeBookTtsForBook(target.book);
        if (tts.tts_warning) {
          warnings.push({ language: target.language, error: tts.tts_warning });
        }
      }),
    );

    await updateGenerationJob(job.id, "succeeded");

    onProgress({
      step: "completed",
      work_id: work.id,
      editions,
      ...(warnings.length > 0 ? { warnings } : {}),
    });

    return { workId: work.id, editions, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book generation failed.";
    await updateGenerationJob(job.id, "failed", message);
    onProgress({ step: "error", message });
    throw error;
  }
}
