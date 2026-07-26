"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { BlockEditor } from "@/app/upload/components/BlockEditor";
import type { BookEditorValues } from "@/app/upload/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
  chapterIndex: number;
  control: Control<BookEditorValues>;
  register: UseFormRegister<BookEditorValues>;
  onRemove: () => void;
  canRemove: boolean;
};

function newId() {
  return crypto.randomUUID();
}

export function ChapterEditor({ chapterIndex, control, register, onRemove, canRemove }: Props) {
  const blocks = useFieldArray({
    control,
    name: `chapters.${chapterIndex}.blocks`,
    keyName: "fieldId",
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.fields.findIndex((field) => field.id === active.id);
    const newIndex = blocks.fields.findIndex((field) => field.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      blocks.move(oldIndex, newIndex);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="min-w-0 flex-1">
            <FieldLabel>Chapter title</FieldLabel>
            <Input
            {...register(`chapters.${chapterIndex}.title`)}
            placeholder="Chapter title"
          />
          </Field>
          <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove chapter
          </Button>
        </div>
      </CardHeader>

      <CardContent>
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {blocks.fields.map((block, blockIndex) => (
              <BlockEditor
                key={block.fieldId}
                chapterIndex={chapterIndex}
                blockIndex={blockIndex}
                block={block}
                register={register}
                onRemove={() => blocks.remove(blockIndex)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            blocks.append({
              id: newId(),
              type: "paragraph",
              content: { text: "" },
            })
          }
        >
          Add paragraph
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            blocks.append({
              id: newId(),
              type: "quote",
              content: { text: "", source: "" },
            })
          }
        >
          Add quote
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}
