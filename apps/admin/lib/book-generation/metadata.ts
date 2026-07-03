import type { BookGenerationMetadata, BookGenerationSettings } from "@readup/db";
import { SOURCE_LANGUAGE } from "./constants";

export function buildGenerationMetadata(args: {
  settings: BookGenerationSettings;
  generatedLanguages: string[];
  subtitle?: string;
  description?: string;
}): BookGenerationMetadata {
  return {
    source_language: SOURCE_LANGUAGE,
    generated_languages: args.generatedLanguages,
    settings: args.settings,
    subtitle: args.subtitle,
    description: args.description,
    generated_at: new Date().toISOString(),
  };
}

export function buildTranslatedMetadata(
  english: BookGenerationMetadata,
  targetLanguage: string,
  translated: { subtitle?: string; description?: string },
): BookGenerationMetadata {
  return {
    ...english,
    generated_languages: english.generated_languages,
    subtitle: translated.subtitle ?? english.subtitle,
    description: translated.description ?? english.description,
    source_language: SOURCE_LANGUAGE,
    generated_at: english.generated_at,
    settings: {
      ...english.settings,
    },
  };
}

export function settingsFromWorkflow(args: {
  topic: string;
  reading_level: BookGenerationSettings["reading_level"];
  length: BookGenerationSettings["length"];
  include_quiz: boolean;
}): BookGenerationSettings {
  return {
    topic: args.topic,
    genres: [],
    reading_level: args.reading_level,
    length: args.length,
    quiz_enabled: args.include_quiz,
  };
}
