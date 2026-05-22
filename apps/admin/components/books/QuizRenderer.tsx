import type { BookQuiz } from "@/lib/book-relational";

export function QuizRenderer({ quiz }: { quiz?: BookQuiz }) {
  if (!quiz) return null;

  return (
    <section className="mt-10 rounded-2xl border border-stone-200 bg-white/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/80">
      <h2 className="font-serif text-2xl font-semibold text-stone-800 dark:text-zinc-50">
        Quiz
      </h2>
      <ol className="mt-4 space-y-5">
        {quiz.questions.map((question) => (
          <li key={question.id}>
            <p className="font-medium text-stone-800 dark:text-zinc-100">{question.question}</p>
            <ul className="mt-2 space-y-1">
              {question.answers.map((answer) => (
                <li key={answer.id} className="text-sm text-stone-600 dark:text-zinc-400">
                  {answer.text}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
