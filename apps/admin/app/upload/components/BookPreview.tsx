"use client";

import type { BookEditorValues } from "@/app/upload/types";

export function BookPreview({ value }: { value: BookEditorValues }) {
  return (
    <aside className="rounded-card border border-elevated bg-surface p-5 shadow-sm">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">
        Live preview
      </p>
      <h2 className="font-reader text-2xl font-semibold text-foreground">
        {value.title || "Untitled book"}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {value.author || "Unknown author"} · {value.language || "No language"}
      </p>

      {value.keywords.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {value.keywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className="rounded-chip border border-elevated bg-background px-2.5 py-1 text-xs text-text-secondary"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {value.chapters.map((chapter, chapterIndex) => (
          <section key={chapter.id || chapterIndex}>
            <h3 className="font-reader text-lg font-semibold text-foreground">
              {chapter.title || `Chapter ${chapterIndex + 1}`}
            </h3>
            <div className="mt-2 space-y-3 font-reader text-sm leading-6 text-text-secondary">
              {chapter.blocks.map((block, blockIndex) =>
                block.type === "quote" ? (
                  <blockquote
                    key={block.id || blockIndex}
                    className="border-l-4 border-brand pl-4 italic text-foreground"
                  >
                    <p>{block.content.text || "Quote..."}</p>
                    {block.content.source ? (
                      <footer className="mt-1 text-xs not-italic text-text-tertiary">
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
