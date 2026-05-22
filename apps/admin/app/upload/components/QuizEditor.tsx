"use client";

import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import type { BookEditorValues } from "@/app/upload/types";

type Props = {
  control: Control<BookEditorValues>;
  register: UseFormRegister<BookEditorValues>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

function newId() {
  return crypto.randomUUID();
}

function defaultAnswer(isCorrect = false) {
  return { id: newId(), text: "", is_correct: isCorrect };
}

function defaultQuestion() {
  return {
    id: newId(),
    question: "",
    answers: [defaultAnswer(true), defaultAnswer(false)],
  };
}

function AnswersEditor({
  questionIndex,
  control,
  register,
}: {
  questionIndex: number;
  control: Control<BookEditorValues>;
  register: UseFormRegister<BookEditorValues>;
}) {
  const answers = useFieldArray({
    control,
    name: `quiz.questions.${questionIndex}.answers`,
    keyName: "fieldId",
  });

  return (
    <div className="mt-3 space-y-2">
      {answers.fields.map((answer, answerIndex) => (
        <div key={answer.fieldId} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 dark:border-zinc-700 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="checkbox"
              {...register(`quiz.questions.${questionIndex}.answers.${answerIndex}.is_correct`)}
              className="h-4 w-4 rounded border-stone-300 text-amber-700"
            />
            <input
              {...register(`quiz.questions.${questionIndex}.answers.${answerIndex}.text`)}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Answer text"
            />
          </label>
          <button
            type="button"
            disabled={answers.fields.length <= 2}
            onClick={() => answers.remove(answerIndex)}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:border-red-900/60 dark:text-red-300"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => answers.append(defaultAnswer(false))}
        className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Add answer
      </button>
    </div>
  );
}

export function QuizEditor({ control, register, enabled, onToggle }: Props) {
  const questions = useFieldArray({
    control,
    name: "quiz.questions",
    keyName: "fieldId",
  });

  return (
    <section className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-800 dark:text-zinc-50">
            Optional quiz
          </h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400">
            Keep 3-5 questions, with multiple answers per question.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-700"
          />
          Include quiz
        </label>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          {questions.fields.map((question, questionIndex) => (
            <article key={question.fieldId} className="rounded-xl border border-stone-200 p-4 dark:border-zinc-700">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-400">
                    Question {questionIndex + 1}
                  </span>
                  <input
                    {...register(`quiz.questions.${questionIndex}.question`)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    placeholder="Question"
                  />
                </label>
                <button
                  type="button"
                  disabled={questions.fields.length <= 3}
                  onClick={() => questions.remove(questionIndex)}
                  className="self-end rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:border-red-900/60 dark:text-red-300"
                >
                  Remove question
                </button>
              </div>
              <AnswersEditor questionIndex={questionIndex} control={control} register={register} />
            </article>
          ))}

          <button
            type="button"
            disabled={questions.fields.length >= 5}
            onClick={() => questions.append(defaultQuestion())}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-40 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Add question
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function createDefaultQuiz() {
  return {
    questions: [defaultQuestion(), defaultQuestion(), defaultQuestion()],
  };
}
