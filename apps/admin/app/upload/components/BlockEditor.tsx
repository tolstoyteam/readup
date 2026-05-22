"use client";

/* eslint-disable react-hooks/refs -- dnd-kit sortable exposes ref/listener props for render. */

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import type { UseFormRegister } from "react-hook-form";
import type { BookEditorValues, EditorBlock } from "@/app/upload/types";

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
    <article
      ref={sortable.setNodeRef}
      style={style}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Drag block"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-500 active:cursor-grabbing dark:border-zinc-700 dark:text-zinc-400"
        >
          Drag
        </button>
        <select
          {...register(`${base}.type`)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="paragraph">Paragraph</option>
          <option value="quote">Quote</option>
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Remove block
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-400">
          Text
        </span>
        <textarea
          {...register(`${base}.content.text`)}
          rows={block.type === "quote" ? 3 : 5}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder={block.type === "quote" ? "Quote text" : "Paragraph text"}
        />
      </label>

      {block.type === "quote" ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-400">
            Source optional
          </span>
          <input
            {...register(`${base}.content.source`)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Speaker or source"
          />
        </label>
      ) : null}
    </article>
  );
}
