import { ChapterBlocksRenderer } from "@/components/books/ChapterBlocksRenderer";
import { QuizRenderer } from "@/components/books/QuizRenderer";
import type { BookWithContent } from "@/lib/book-relational";

export function BookReader({ book }: { book: BookWithContent }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-10 border-b border-stone-200 pb-6 dark:border-zinc-800">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 dark:text-zinc-50">
          {book.title}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-zinc-400">{book.author}</p>
        {book.keywords.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {book.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="space-y-10">
        {book.chapters.map((chapter) => (
          <section key={chapter.id}>
            <h2 className="mb-4 font-serif text-2xl font-semibold text-stone-800 dark:text-zinc-50">
              {chapter.title}
            </h2>
            <ChapterBlocksRenderer blocks={chapter.blocks} />
          </section>
        ))}
      </div>

      <QuizRenderer quiz={book.quiz} />
    </article>
  );
}
