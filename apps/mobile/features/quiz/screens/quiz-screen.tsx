import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchQuizForBook,
  submitQuiz,
  type Quiz,
  type QuizAttemptResult,
} from "@/features/quiz/api/quiz";
import { ReadupColors } from "@/shared/constants/readup-theme";

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = params.bookId ? decodeURIComponent(params.bookId) : "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const load = useCallback(async () => {
    if (!bookId) {
      setError("Тест недоступен");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchQuizForBook(bookId);
      if (!data) {
        setError("Для этой книги нет теста");
        setQuiz(null);
        return;
      }
      setQuiz(data);
      setAnswers({});
      setResult(null);
      setCurrentIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить тест");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalQuestions = quiz?.questions.length ?? 0;
  const allAnswered =
    quiz != null &&
    quiz.questions.every((q) => answers[q.id] != null);
  const progress = useMemo(() => {
    if (!quiz || totalQuestions === 0) return 0;
    const answered = Object.keys(answers).length;
    return Math.min(answered / totalQuestions, 1);
  }, [answers, quiz, totalQuestions]);

  async function onSubmit() {
    if (!quiz || submitting || !allAnswered) return;
    setSubmitting(true);
    try {
      const payload = quiz.questions.map((q) => ({
        question_id: q.id,
        answer_id: answers[q.id] ?? null,
      }));
      const attempt = await submitQuiz({
        bookId,
        quizId: quiz.id,
        answers: payload,
      });
      setResult(attempt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответы");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setCurrentIndex(0);
  }

  if (result && quiz) {
    return <QuizResult result={result} quiz={quiz} onRetry={restart} onClose={() => router.back()} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Закрыть тест"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
        >
          <ArrowLeft size={22} color={ReadupColors.text} strokeWidth={2} />
        </Pressable>
        {quiz ? (
          <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#4A5550]">
            {currentIndex + 1} / {totalQuestions}
          </Text>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ReadupColors.brand} />
        </View>
      ) : error || !quiz ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-center text-[15px] leading-6 text-[#4A5550]">
            {error ?? "Тест не найден"}
          </Text>
          <Pressable
            onPress={load}
            className="rounded-full bg-[#059669] px-6 py-3 active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-[#FBFAF2]">
              Повторить
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E6D8]">
            <View
              className="h-full rounded-full bg-[#059669]"
              style={{ width: `${progress * 100}%` }}
            />
          </View>

          {quiz.questions.map((question, index) => (
            <View key={question.id} className="mt-7">
              <Text className="text-[12px] uppercase tracking-[-0.48px] text-[#7A7868]">
                Вопрос {index + 1}
              </Text>
              <Text className="mt-1 text-[20px] font-semibold leading-[26px] tracking-[-0.8px] text-[#1A2420]">
                {question.question}
              </Text>
              <View className="mt-4 gap-2.5">
                {question.answers.map((answer) => {
                  const selected = answers[question.id] === answer.id;
                  return (
                    <Pressable
                      key={answer.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setAnswers((prev) => ({ ...prev, [question.id]: answer.id }));
                        setCurrentIndex(index);
                      }}
                      className="flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-90"
                      style={{
                        borderColor: selected
                          ? ReadupColors.brand
                          : ReadupColors.elevated,
                        backgroundColor: selected ? "#ECFDF5" : ReadupColors.surface,
                      }}
                    >
                      <View
                        className="h-5 w-5 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: selected
                            ? ReadupColors.brand
                            : ReadupColors.textTertiary,
                          backgroundColor: selected ? ReadupColors.brand : "transparent",
                        }}
                      >
                        {selected ? (
                          <View className="h-2 w-2 rounded-full bg-[#FBFAF2]" />
                        ) : null}
                      </View>
                      <Text
                        className="flex-1 text-[15px] tracking-[-0.6px] text-[#1A2420]"
                        numberOfLines={3}
                      >
                        {answer.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable
            onPress={onSubmit}
            disabled={!allAnswered || submitting}
            accessibilityRole="button"
            className="mt-8 min-h-[54px] items-center justify-center rounded-full border-2 active:opacity-90"
            style={{
              backgroundColor:
                !allAnswered || submitting ? "#9CCFB9" : ReadupColors.brand,
              borderColor:
                !allAnswered || submitting ? "#9CCFB9" : ReadupColors.brandDark,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={ReadupColors.textInverse} />
            ) : (
              <Text className="text-[18px] font-medium tracking-[-0.36px] text-[#FBFAF2]">
                Завершить тест
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function QuizResult({
  result,
  quiz,
  onRetry,
  onClose,
}: {
  result: QuizAttemptResult;
  quiz: Quiz;
  onRetry: () => void;
  onClose: () => void;
}) {
  const correctRatio = result.totalQuestions
    ? result.score / result.totalQuestions
    : 0;
  const headline =
    correctRatio === 1
      ? "Отличный результат!"
      : correctRatio >= 0.6
        ? "Хороший результат"
        : "Нужно ещё попрактиковаться";

  const questionsById = new Map(quiz.questions.map((q) => [q.id, q]));

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
        >
          <ArrowLeft size={22} color={ReadupColors.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center pt-6">
          <Text className="text-[34px] font-extrabold tracking-[-1.36px] text-[#1A2420]">
            {result.score} / {result.totalQuestions}
          </Text>
          <Text className="mt-2 text-[16px] tracking-[-0.64px] text-[#4A5550]">
            {headline}
          </Text>
        </View>

        <View className="mt-8 gap-3">
          {result.answers.map((entry, index) => {
            const question = questionsById.get(entry.question_id);
            if (!question) return null;
            return (
              <View
                key={`${entry.question_id}-${index}`}
                className="rounded-2xl border bg-[#F2F0E6] px-4 py-3"
                style={{
                  borderColor: entry.is_correct ? ReadupColors.brand : "#E8B0B0",
                }}
              >
                <View className="flex-row items-center gap-2">
                  {entry.is_correct ? (
                    <CheckCircle2
                      size={18}
                      color={ReadupColors.brand}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <XCircle size={18} color="#B85C5C" strokeWidth={2.2} />
                  )}
                  <Text className="text-[12px] uppercase tracking-[-0.48px] text-[#7A7868]">
                    Вопрос {index + 1}
                  </Text>
                </View>
                <Text className="mt-1 text-[14px] tracking-[-0.56px] text-[#1A2420]">
                  {question.question}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          className="mt-8 min-h-[54px] flex-row items-center justify-center gap-2 rounded-full border border-[#059669] active:opacity-90"
        >
          <RotateCcw size={18} color={ReadupColors.brand} strokeWidth={2.2} />
          <Text className="text-[16px] font-medium tracking-[-0.36px] text-[#059669]">
            Пройти ещё раз
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
