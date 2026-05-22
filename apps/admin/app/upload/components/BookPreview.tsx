"use client";

import type { BookEditorValues } from "@/app/upload/types";

export function BookPreview({ value }: { value: BookEditorValues }) {
  return (
    <aside className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-200/70">
        Live preview
      </p>
      <h2 className="font-serif text-2xl font-semibold text-stone-800 dark:text-zinc-50">
        {value.title || "Untitled book"}
      </h2>
      <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
        {value.author || "Unknown author"} · {value.language || "No language"}
      </p>

      {value.keywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.keywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {value.chapters.map((chapter, chapterIndex) => (
          <section key={chapter.id || chapterIndex}>
            <h3 className="font-serif text-lg font-semibold text-stone-800 dark:text-zinc-50">
              {chapter.title || `Chapter ${chapterIndex + 1}`}
            </h3>
            <div className="mt-2 space-y-3 text-sm leading-6 text-stone-700 dark:text-zinc-300">
              {chapter.blocks.map((block, blockIndex) =>
                block.type === "quote" ? (
                  <blockquote
                    key={block.id || blockIndex}
                    className="border-l-4 border-amber-300 pl-4 italic text-stone-600 dark:border-amber-700 dark:text-zinc-300"
                  >
                    <p>{block.content.text || "Quote..."}</p>
                    {block.content.source ? (
                      <footer className="mt-1 text-xs not-italic text-stone-500 dark:text-zinc-500">
                        {block.content.source}
                      </footer>
                    ) : null}
                  </blockquote>
                ) : (
                  <p key={block.id || blockIndex}>{block.content.text || "Paragraph..."}</p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
