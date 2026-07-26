"use client";

import {
  Controller,
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import type { BookEditorValues } from "@/app/upload/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
    <div className="mt-3 flex flex-col gap-2">
      {answers.fields.map((answer, answerIndex) => (
        <div
          key={answer.fieldId}
          className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Controller
              control={control}
              name={`quiz.questions.${questionIndex}.answers.${answerIndex}.is_correct`}
              render={({ field }) => (
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <Input
              {...register(`quiz.questions.${questionIndex}.answers.${answerIndex}.text`)}
              className="min-w-0 flex-1"
              placeholder="Answer text"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={answers.fields.length <= 2}
            onClick={() => answers.remove(answerIndex)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => answers.append(defaultAnswer(false))}
      >
        Add answer
      </Button>
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
    <Card>
      <CardHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Optional quiz</CardTitle>
          <CardDescription>
            Keep 3-5 questions, with multiple answers per question.
          </CardDescription>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Checkbox
            checked={enabled}
            onCheckedChange={(checked) => onToggle(checked)}
          />
          Include quiz
        </label>
      </div>
      </CardHeader>

      {enabled ? (
        <CardContent>
        <div className="flex flex-col gap-4">
          {questions.fields.map((question, questionIndex) => (
            <Card
              key={question.fieldId}
              size="sm"
            >
              <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Field className="min-w-0 flex-1">
                  <FieldLabel>Question {questionIndex + 1}</FieldLabel>
                  <Input
                    {...register(`quiz.questions.${questionIndex}.question`)}
                    placeholder="Question"
                  />
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={questions.fields.length <= 3}
                  onClick={() => questions.remove(questionIndex)}
                  className="self-end"
                >
                  Remove question
                </Button>
              </div>
              <AnswersEditor questionIndex={questionIndex} control={control} register={register} />
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={questions.fields.length >= 5}
            onClick={() => questions.append(defaultQuestion())}
          >
            Add question
          </Button>
        </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function createDefaultQuiz() {
  return {
    questions: [defaultQuestion(), defaultQuestion(), defaultQuestion()],
  };
}
