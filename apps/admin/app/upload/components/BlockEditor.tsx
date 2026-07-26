"use client";

/* eslint-disable react-hooks/refs -- dnd-kit sortable exposes ref/listener props for render. */

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { UseFormRegister } from "react-hook-form";
import type { BookEditorValues, EditorBlock } from "@/app/upload/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  chapterIndex: number;
  blockIndex: number;
  block: EditorBlock;
  register: UseFormRegister<BookEditorValues>;
  onRemove: () => void;
};

export function BlockEditor({ chapterIndex, blockIndex, block, register, onRemove }: Props) {
  const sortable = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const base = `chapters.${chapterIndex}.blocks.${blockIndex}` as const;

  return (
    <Card
      ref={sortable.setNodeRef}
      style={style}
      size="sm"
    >
      <CardContent>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          aria-label="Drag block"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          Drag
        </Button>
        <select
          {...register(`${base}.type`)}
          className="h-12 rounded-input border border-input bg-secondary px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <option value="paragraph">Paragraph</option>
          <option value="quote">Quote</option>
        </select>
        <Button
          type="button"
          size="xs"
          variant="destructive"
          onClick={onRemove}
          className="ml-auto"
        >
          Remove block
        </Button>
      </div>

      <Field>
        <FieldLabel>Text</FieldLabel>
        <Textarea
          {...register(`${base}.content.text`)}
          rows={block.type === "quote" ? 3 : 5}
          placeholder={block.type === "quote" ? "Quote text" : "Paragraph text"}
        />
      </Field>

      {block.type === "quote" ? (
        <Field className="mt-3">
          <FieldLabel>Source optional</FieldLabel>
          <Input
            {...register(`${base}.content.source`)}
            placeholder="Speaker or source"
          />
        </Field>
      ) : null}
      </CardContent>
    </Card>
  );
}
