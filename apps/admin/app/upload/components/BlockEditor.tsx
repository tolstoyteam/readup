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
      className="rounded-card border border-elevated bg-background p-4 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Drag block"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab rounded-md border border-elevated bg-surface px-2 py-1 text-xs font-medium text-text-tertiary active:cursor-grabbing"
        >
          Drag
        </button>
        <select
          {...register(`${base}.type`)}
          className="rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="paragraph">Paragraph</option>
          <option value="quote">Quote</option>
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-lg border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
        >
          Remove block
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
          Text
        </span>
        <textarea
          {...register(`${base}.content.text`)}
          rows={block.type === "quote" ? 3 : 5}
          className="w-full rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          placeholder={block.type === "quote" ? "Quote text" : "Paragraph text"}
        />
      </label>

      {block.type === "quote" ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
            Source optional
          </span>
          <input
            {...register(`${base}.content.source`)}
            className="w-full rounded-lg border border-elevated bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            placeholder="Speaker or source"
          />
        </label>
      ) : null}
    </article>
  );
}
