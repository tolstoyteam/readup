import type { BookBlock } from "@/lib/book-relational";

export function ChapterBlocksRenderer({ blocks }: { blocks: BookBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id} className="leading-7 text-stone-700 dark:text-zinc-300">
                {block.content.text}
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="border-l-4 border-amber-300 pl-4 italic text-stone-600 dark:border-amber-700 dark:text-zinc-300"
              >
                <p>{block.content.text}</p>
                {"source" in block.content && block.content.source ? (
                  <footer className="mt-2 text-sm not-italic text-stone-500 dark:text-zinc-500">
                    {block.content.source}
                  </footer>
                ) : null}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
