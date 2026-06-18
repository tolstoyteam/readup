import { supabase } from "@/shared/lib/supabase";

export type QuizAnswerOption = {
  id: number;
  text: string;
};

export type QuizQuestion = {
  id: number;
  question: string;
  orderIndex: number;
  answers: QuizAnswerOption[];
};

export type Quiz = {
  id: number;
  bookId: number;
  questions: QuizQuestion[];
};

export type QuizAttemptResult = {
  id: string;
  bookId: string;
  quizId: number;
  score: number;
  totalQuestions: number;
  answers: Array<{
    question_id: number;
    answer_id: number | null;
    is_correct: boolean;
  }>;
};

/**
 * Fetches the latest quiz for a book by its string book_id (which equals books.id::text).
 * Returns null when no quiz exists or the user lacks RLS access.
 */
export async function fetchQuizForBook(bookId: string): Promise<Quiz | null> {
  const numericBookId = Number(bookId);
  if (!Number.isFinite(numericBookId) || numericBookId <= 0) return null;

  const { data: quizRow, error: quizError } = await supabase
    .from("quizzes")
    .select("id, book_id")
    .eq("book_id", numericBookId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (quizError || !quizRow) return null;

  const { data: questionRows, error: questionError } = await supabase
    .from("quiz_questions")
    .select("id, question, order_index")
    .eq("quiz_id", quizRow.id)
    .order("order_index", { ascending: true });

  if (questionError || !questionRows || questionRows.length === 0) return null;

  const questionIds = questionRows.map((row) => row.id as number);

  const { data: answerRows, error: answerError } = await supabase
    .from("quiz_answers")
    .select("id, question_id, text")
    .in("question_id", questionIds);

  if (answerError) return null;

  const answersByQuestion = new Map<number, QuizAnswerOption[]>();
  for (const row of answerRows ?? []) {
    const questionId = (row as { question_id: number }).question_id;
    const id = (row as { id: number }).id;
    const text = (row as { text: string }).text;
    const list = answersByQuestion.get(questionId) ?? [];
    list.push({ id, text });
    answersByQuestion.set(questionId, list);
  }

  return {
    id: quizRow.id as number,
    bookId: quizRow.book_id as number,
    questions: questionRows.map((row) => ({
      id: row.id as number,
      question: row.question as string,
      orderIndex: row.order_index as number,
      answers: answersByQuestion.get(row.id as number) ?? [],
    })),
  };
}

/** Returns whether the book has a quiz with at least one question (playable). */
export async function bookHasPlayableQuiz(bookId: string): Promise<boolean> {
  const quiz = await fetchQuizForBook(bookId);
  return quiz != null;
}

/** @deprecated Use bookHasPlayableQuiz — kept for compatibility. */
export async function bookHasQuiz(bookId: string): Promise<boolean> {
  return bookHasPlayableQuiz(bookId);
}

export async function submitQuiz(args: {
  bookId: string;
  quizId: number;
  answers: { question_id: number; answer_id: number | null }[];
}): Promise<QuizAttemptResult | null> {
  const { data, error } = await supabase.rpc("complete_quiz", {
    p_book_id: args.bookId,
    p_quiz_id: args.quizId,
    p_answers: args.answers,
  });
  if (error) throw error;
  if (!data) return null;
  const record = data as {
    id: string;
    book_id: string;
    quiz_id: number;
    score: number;
    total_questions: number;
    answers: QuizAttemptResult["answers"];
  };
  return {
    id: record.id,
    bookId: record.book_id,
    quizId: record.quiz_id,
    score: record.score,
    totalQuestions: record.total_questions,
    answers: Array.isArray(record.answers) ? record.answers : [],
  };
}
