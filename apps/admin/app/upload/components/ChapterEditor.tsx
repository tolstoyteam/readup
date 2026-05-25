"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { BlockEditor } from "@/app/upload/components/BlockEditor";
import type { BookEditorValues } from "@/app/upload/types";

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
    <section className="rounded-card border border-elevated bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
            Chapter title
          </span>
          <input
            {...register(`chapters.${chapterIndex}.title`)}
            className="w-full rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            placeholder="Chapter title"
          />
        </label>
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-40"
        >
          Remove chapter
        </button>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
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
        <button
          type="button"
          onClick={() =>
            blocks.append({
              id: newId(),
              type: "paragraph",
              content: { text: "" },
            })
          }
          className="rounded-button border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/15"
        >
          Add paragraph
        </button>
        <button
          type="button"
          onClick={() =>
            blocks.append({
              id: newId(),
              type: "quote",
              content: { text: "", source: "" },
            })
          }
          className="rounded-button border border-elevated bg-background px-3 py-2 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand"
        >
          Add quote
        </button>
      </div>
    </section>
  );
}
