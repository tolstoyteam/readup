"use client";

/* eslint-disable react-hooks/refs -- dnd-kit sortable exposes ref/listener props for render. */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { BookContentInput } from "@/lib/book-content";
import { parseBookContentInput } from "@/lib/book-content";
import {
  COVER_HEIGHT_WIDTH_RATIO,
  COVER_RATIO_TOLERANCE,
  isCoverAspectRatio,
} from "@/lib/cover-ratio";
import { genreDisplayName } from "@/lib/book-genres";
import { LANGUAGE_OPTIONS } from "@/lib/book-language";
import type { BookWithContent } from "@/lib/book-relational";
import { BookPreview } from "@/app/upload/components/BookPreview";
import { ChapterEditor } from "@/app/upload/components/ChapterEditor";
import { QuizEditor, createDefaultQuiz } from "@/app/upload/components/QuizEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BOOK_GENRES, type BookEditorValues, type BookGenre } from "./types";

export type BookEditContext = {
  recordId: number;
  initial: BookWithContent;
};

function newId() {
  return crypto.randomUUID();
}

function createChapter() {
  return {
    id: newId(),
    title: "",
    blocks: [
      {
        id: newId(),
        type: "paragraph" as const,
        content: { text: "" },
      },
    ],
  };
}

export function emptyEditorValues(): BookEditorValues {
  return {
    title: "",
    author: "",
    language: "en",
    genres: [],
    keywords: [],
    cover_image_url: undefined,
    chapters: [createChapter()],
    quiz: undefined,
  };
}

function toEditorValues(book?: BookWithContent): BookEditorValues {
  if (!book) return emptyEditorValues();

  return {
    title: book.title,
    author: book.author,
    language: book.language,
    genres: book.genres.filter((genre): genre is BookGenre =>
      (BOOK_GENRES as readonly string[]).includes(genre),
    ),
    keywords: book.keywords,
    cover_image_url: book.coverImageUrl,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.stableId,
      title: chapter.title,
      blocks: chapter.blocks.map((block) => ({
        id: block.stableId,
        type: block.type,
        content:
          block.type === "quote"
            ? {
                text: block.content.text,
                source: "source" in block.content ? block.content.source ?? "" : "",
              }
            : { text: block.content.text },
      })),
    })),
    quiz: book.quiz
      ? {
          questions: book.quiz.questions.map((question) => ({
            id: String(question.id),
            question: question.question,
            answers: question.answers.map((answer) => ({
              id: String(answer.id),
              text: answer.text,
              is_correct: answer.isCorrect,
            })),
          })),
        }
      : undefined,
  };
}

/** Convert a server-validated BookContentInput (no editor ids) into editor values. */
export function bookContentInputToEditorValues(input: BookContentInput): BookEditorValues {
  return {
    title: input.title,
    author: input.author,
    language: input.language,
    genres: input.genres,
    keywords: input.keywords ?? [],
    cover_image_url: input.cover_image_url ?? undefined,
    chapters: input.chapters.map((chapter) => ({
      id: chapter.id ?? newId(),
      title: chapter.title,
      blocks: chapter.blocks.map((block) => ({
        id: block.id ?? newId(),
        type: block.type,
        content:
          block.type === "quote"
            ? { text: block.content.text, source: block.content.source ?? "" }
            : { text: block.content.text },
      })),
    })),
    quiz: input.quiz
      ? {
          questions: input.quiz.questions.map((question) => ({
            id: question.id ?? newId(),
            question: question.question,
            answers: question.answers.map((answer) => ({
              id: answer.id ?? newId(),
              text: answer.text,
              is_correct: answer.is_correct,
            })),
          })),
        }
      : undefined,
  };
}

export async function validateCoverFile(file: File): Promise<string | null> {
  const lower = file.name.toLowerCase();
  if (!/\.(png|jpe?g|svg)$/.test(lower)) {
    return "Cover couldn't be added. Use PNG, JPEG, or SVG only.";
  }
  const mime = file.type.toLowerCase();
  if (mime && mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/jpg" && mime !== "image/svg+xml") {
    return "Cover couldn't be added. Use PNG, JPEG, or SVG only.";
  }
  const url = URL.createObjectURL(file);
  try {
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("load"));
      img.src = url;
    });
    if (!isCoverAspectRatio(h, w)) {
      return `Cover height ÷ width must be ${COVER_HEIGHT_WIDTH_RATIO} (±${COVER_RATIO_TOLERANCE}). This image is ${h}×${w}px.`;
    }
  } catch {
    return "Cover couldn't be read. The file may be corrupted or unsupported.";
  } finally {
    URL.revokeObjectURL(url);
  }
  return null;
}

function SortableChapterShell({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const sortable = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          size="xs"
          variant="outline"
          aria-label="Drag chapter"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          Drag chapter
        </Button>
      </div>
      {children}
    </div>
  );
}

type BookUploadFormProps = {
  editContext?: BookEditContext;
  /** When provided, the form initializes with these values instead of empty/edit defaults. */
  initialDraft?: BookEditorValues;
  /** Cover file pre-selected (e.g. from AI generate modal) before the form mounted. */
  initialCoverFile?: File | null;
  /** Show a "Generate with AI" button in the form header and invoke this when clicked. */
  onRequestGenerate?: () => void;
};

export function BookUploadForm({
  editContext,
  initialDraft,
  initialCoverFile,
  onRequestGenerate,
}: BookUploadFormProps) {
  const router = useRouter();
  const [genrePick, setGenrePick] = useState<BookGenre | "">("");
  const [keywordDraft, setKeywordDraft] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(initialCoverFile ?? null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [coverHint, setCoverHint] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTranslation, setIsGeneratingTranslation] = useState(false);
  const [isRetryingTts, setIsRetryingTts] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState(
    () => LANGUAGE_OPTIONS.find((option) => option.value !== editContext?.initial.language)?.value ?? "en",
  );
  const [quizEnabled, setQuizEnabled] = useState(() =>
    Boolean(initialDraft?.quiz ?? editContext?.initial.quiz),
  );

  const defaultValues = initialDraft ?? toEditorValues(editContext?.initial);

  const form = useForm<BookEditorValues>({
    defaultValues,
    mode: "onChange",
  });

  const chapters = useFieldArray({
    control: form.control,
    name: "chapters",
    keyName: "fieldId",
  });

  const values = useWatch({
    control: form.control,
    defaultValue: defaultValues,
  }) as BookEditorValues;
  const { genres: selectedGenres, keywords } = values;
  const jsonPretty = useMemo(() => JSON.stringify(values, null, 2), [values]);

  const addGenre = () => {
    if (!genrePick || selectedGenres.includes(genrePick) || selectedGenres.length >= 5) return;
    form.setValue("genres", [...selectedGenres, genrePick], { shouldDirty: true, shouldValidate: true });
    setGenrePick("");
  };

  const addKeyword = () => {
    const keyword = keywordDraft.trim();
    if (!keyword) return;
    if (keywords.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
      setKeywordDraft("");
      return;
    }
    form.setValue("keywords", [...keywords, keyword], { shouldDirty: true, shouldValidate: true });
    setKeywordDraft("");
  };

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.fields.findIndex((field) => field.id === active.id);
    const newIndex = chapters.fields.findIndex((field) => field.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      chapters.move(oldIndex, newIndex);
    }
  };

  const setQuiz = (enabled: boolean) => {
    setQuizEnabled(enabled);
    form.setValue("quiz", enabled ? form.getValues("quiz") ?? createDefaultQuiz() : undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submit = async (rawValues: BookEditorValues) => {
    setStatus(null);
    setError(null);

    const payload = {
      ...rawValues,
      cover_image_url: coverRemoved ? null : rawValues.cover_image_url,
      quiz: quizEnabled ? rawValues.quiz : undefined,
    };
    const parsed = parseBookContentInput(payload);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setIsSaving(true);
    try {
      const url = editContext ? `/api/books/${editContext.recordId}` : "/api/books";
      const method = editContext ? "PATCH" : "POST";
      let response: Response;
      if (coverFile) {
        const formData = new FormData();
        formData.append("book", JSON.stringify(parsed.data));
        formData.append("cover", coverFile);
        response = await fetch(url, { method, body: formData });
      } else {
        response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Save failed");
      }

      setStatus(editContext ? "Book updated." : "Book created.");
      setCoverFile(null);
      setCoverRemoved(false);
      router.refresh();
      if (!editContext && typeof data.id === "number") {
        router.push(`/books/${data.id}/edit`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const generateTranslation = async () => {
    if (!editContext || isGeneratingTranslation) return;
    setStatus(null);
    setError(null);
    setIsGeneratingTranslation(true);
    try {
      const response = await fetch(`/api/books/${editContext.recordId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: translationLanguage, generate_tts: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Translation failed");
      }
      setStatus(`Translation saved for ${translationLanguage}.`);
      router.refresh();
      if (typeof data.id === "number") {
        router.push(`/books/${data.id}/edit`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setIsGeneratingTranslation(false);
    }
  };

  const retryTts = async () => {
    if (!editContext || isRetryingTts) return;
    setStatus(null);
    setError(null);
    setIsRetryingTts(true);
    try {
      const response = await fetch(`/api/books/${editContext.recordId}/tts/retry`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(typeof data?.error === "string" ? data.error : data?.tts_warning ?? "TTS retry failed");
      }
      setStatus("TTS regenerated for this edition.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "TTS retry failed");
    } finally {
      setIsRetryingTts(false);
    }
  };

  return (
    <main className="min-h-full bg-background p-4 text-foreground sm:p-6 lg:p-8">
      <form
        onSubmit={form.handleSubmit(submit)}
        className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {editContext ? "Edit book" : "New book"}
              </p>
              <h1 className="text-2xl font-bold text-foreground">
                Block-based book composer
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Chapters and paragraph/quote blocks save as normalized relational rows with stable
                IDs for multilingual alignment. The JSON panel is only a request preview.
              </p>
              {editContext ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Work {editContext.initial.workId} · {editContext.initial.status}
                </p>
              ) : null}
            </div>
            {onRequestGenerate ? (
              <Button
                type="button"
                onClick={onRequestGenerate}
              >
                Generate with AI
              </Button>
            ) : null}
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Book information</CardTitle>
              <CardDescription>Core metadata and cover image for this edition.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                  {...form.register("title")}
                />
                </Field>
                <Field>
                  <FieldLabel>Author</FieldLabel>
                  <Input
                  {...form.register("author")}
                />
                </Field>
                <Field>
                  <FieldLabel>Language</FieldLabel>
                <select
                  {...form.register("language")}
                  className="h-12 w-full rounded-input border border-input bg-secondary px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                </Field>
                <Field>
                  <FieldLabel>Cover image</FieldLabel>
                  <Input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={async (event) => {
                    const file = event.target.files?.[0] ?? null;
                    setCoverHint(null);
                    if (!file) {
                      setCoverFile(null);
                      return;
                    }
                    const message = await validateCoverFile(file);
                    if (message) {
                      setCoverHint(message);
                      setCoverFile(null);
                      event.target.value = "";
                      return;
                    }
                    setCoverFile(file);
                    setCoverRemoved(false);
                  }}
                />
                {coverFile ? (
                  <p className="text-xs text-muted-foreground">
                    Selected: {coverFile.name}
                  </p>
                ) : null}
                </Field>
              </FieldGroup>
            {coverHint ? (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{coverHint}</AlertDescription>
              </Alert>
            ) : null}
            {editContext?.initial.coverImageUrl && !coverRemoved ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setCoverRemoved(true);
                  form.setValue("cover_image_url", null, { shouldDirty: true });
                }}
                className="mt-4"
              >
                Remove existing cover
              </Button>
            ) : null}
            </CardContent>
          </Card>

          {editContext ? (
            <Card>
              <CardHeader>
                <CardTitle>Work languages</CardTitle>
                <CardDescription>
                  Generate or retry only this edition without regenerating the whole work.
                </CardDescription>
              </CardHeader>
              <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={translationLanguage}
                  onChange={(event) =>
                    setTranslationLanguage(event.target.value as typeof translationLanguage)
                  }
                  className="h-12 rounded-input border border-input bg-secondary px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  {LANGUAGE_OPTIONS.filter((option) => option.value !== editContext.initial.language).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={generateTranslation}
                  disabled={isGeneratingTranslation}
                >
                  {isGeneratingTranslation ? "Translating..." : "Generate translation"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={retryTts}
                  disabled={isRetryingTts}
                >
                  {isRetryingTts ? "Regenerating TTS..." : "Retry TTS only"}
                </Button>
              </div>
              {editContext.initial.translationError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Translation error: {editContext.initial.translationError}
                  </AlertDescription>
                </Alert>
              ) : null}
              {editContext.initial.ttsError ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>TTS error: {editContext.initial.ttsError}</AlertDescription>
                </Alert>
              ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Genres and keywords</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={genrePick}
                onChange={(event) => setGenrePick(event.target.value as BookGenre | "")}
                className="h-12 rounded-input border border-input bg-secondary px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <option value="">Выберите жанр</option>
                {BOOK_GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genreDisplayName(genre)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addGenre}
              >
                Добавить жанр
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedGenres.map((genre) => (
                <Badge
                  render={<button type="button" />}
                  key={genre}
                  onClick={() =>
                    form.setValue(
                      "genres",
                      selectedGenres.filter((item) => item !== genre),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  {genreDisplayName(genre)} ×
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                value={keywordDraft}
                onChange={(event) => setKeywordDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addKeyword();
                  }
                }}
                className="min-w-0 flex-1"
                placeholder="Keyword"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addKeyword}
              >
                Add keyword
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge
                  variant="secondary"
                  render={<button type="button" />}
                  key={`${keyword}-${index}`}
                  onClick={() =>
                    form.setValue(
                      "keywords",
                      keywords.filter((_, i) => i !== index),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  {keyword} ×
                </Badge>
              ))}
            </div>
            </CardContent>
          </Card>

          <DndContext onDragEnd={handleChapterDragEnd}>
            <SortableContext
              items={chapters.fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-5">
                {chapters.fields.map((chapter, chapterIndex) => (
                  <SortableChapterShell key={chapter.fieldId} id={chapter.id}>
                    <ChapterEditor
                      chapterIndex={chapterIndex}
                      control={form.control}
                      register={form.register}
                      canRemove={chapters.fields.length > 1}
                      onRemove={() => chapters.remove(chapterIndex)}
                    />
                  </SortableChapterShell>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="outline"
            onClick={() => chapters.append(createChapter())}
          >
            Add chapter
          </Button>

          <QuizEditor
            control={form.control}
            register={form.register}
            enabled={quizEnabled}
            onToggle={setQuiz}
          />

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {status ? (
            <Alert>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editContext ? "Save changes" : "Create book"}
            </Button>
            <details className="min-w-full">
              <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-brand">
                Request preview JSON
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-foreground p-4 text-xs text-background">
                {jsonPretty}
              </pre>
            </details>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <BookPreview value={values} />
        </div>
      </form>
    </main>
  );
}
