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
        <div
          key={answer.fieldId}
          className="flex flex-col gap-2 rounded-lg border border-elevated bg-background p-3 sm:flex-row sm:items-center"
        >
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="checkbox"
              {...register(`quiz.questions.${questionIndex}.answers.${answerIndex}.is_correct`)}
              className="h-4 w-4 rounded border-elevated accent-brand"
            />
            <input
              {...register(`quiz.questions.${questionIndex}.answers.${answerIndex}.text`)}
              className="min-w-0 flex-1 rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
              placeholder="Answer text"
            />
          </label>
          <button
            type="button"
            disabled={answers.fields.length <= 2}
            onClick={() => answers.remove(answerIndex)}
            className="rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger disabled:pointer-events-none disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => answers.append(defaultAnswer(false))}
        className="rounded-button border border-elevated bg-background px-3 py-2 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand"
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
    <section className="rounded-card border border-elevated bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            Optional quiz
          </h2>
          <p className="text-sm text-text-secondary">
            Keep 3-5 questions, with multiple answers per question.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-4 w-4 rounded border-elevated accent-brand"
          />
          Include quiz
        </label>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          {questions.fields.map((question, questionIndex) => (
            <article
              key={question.fieldId}
              className="rounded-card border border-elevated bg-background p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                    Question {questionIndex + 1}
                  </span>
                  <input
                    {...register(`quiz.questions.${questionIndex}.question`)}
                    className="w-full rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                    placeholder="Question"
                  />
                </label>
                <button
                  type="button"
                  disabled={questions.fields.length <= 3}
                  onClick={() => questions.remove(questionIndex)}
                  className="self-end rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger disabled:pointer-events-none disabled:opacity-40"
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
            className="rounded-button border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/15 disabled:pointer-events-none disabled:opacity-40"
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
