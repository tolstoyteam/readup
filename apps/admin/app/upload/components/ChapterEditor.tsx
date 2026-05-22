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
    <section className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-400">
            Chapter title
          </span>
          <input
            {...register(`chapters.${chapterIndex}.title`)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Chapter title"
          />
        </label>
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
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
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
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
          className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Add quote
        </button>
      </div>
    </section>
  );
}
