import type { CreateUserQuoteInput, UserQuote } from "@readup/db/shared";
import { supabase } from "@/shared/lib/supabase";

const QUOTE_COLUMNS =
  "id, user_id, work_id, edition_book_id, language, chapter_stable_id, chapter_title, page_number, block_stable_id, start_offset, end_offset, selected_text, created_at";

function normalizeQuoteRow(row: unknown): UserQuote | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : null;
  const userId = typeof record.user_id === "string" ? record.user_id : null;
  const workId = typeof record.work_id === "string" ? record.work_id : null;
  const editionBookId =
    typeof record.edition_book_id === "number" ? record.edition_book_id : null;
  const language = typeof record.language === "string" ? record.language : null;
  const chapterStableId =
    typeof record.chapter_stable_id === "string" ? record.chapter_stable_id : null;
  const chapterTitle =
    typeof record.chapter_title === "string" ? record.chapter_title : null;
  const pageNumber =
    typeof record.page_number === "number" ? record.page_number : null;
  const blockStableId =
    typeof record.block_stable_id === "string" ? record.block_stable_id : null;
  const startOffset =
    typeof record.start_offset === "number" ? record.start_offset : null;
  const endOffset =
    typeof record.end_offset === "number" ? record.end_offset : null;
  const selectedText =
    typeof record.selected_text === "string" ? record.selected_text : null;
  const createdAt =
    typeof record.created_at === "string" ? record.created_at : null;

  if (
    !id ||
    !userId ||
    !workId ||
    editionBookId === null ||
    !language ||
    !chapterStableId ||
    pageNumber === null ||
    !blockStableId ||
    startOffset === null ||
    endOffset === null ||
    !selectedText ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    userId,
    workId,
    editionBookId,
    language,
    chapterStableId,
    chapterTitle,
    pageNumber,
    blockStableId,
    startOffset,
    endOffset,
    selectedText,
    createdAt,
  };
}

export async function fetchUserQuotes(userId: string): Promise<UserQuote[]> {
  const { data, error } = await supabase
    .from("user_quotes")
    .select(QUOTE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeQuoteRow).filter((item): item is UserQuote => !!item);
}

export async function fetchQuotesForEdition(
  userId: string,
  editionBookId: string,
): Promise<UserQuote[]> {
  const numericId = Number(editionBookId);
  if (!Number.isFinite(numericId)) return [];

  const { data, error } = await supabase
    .from("user_quotes")
    .select(QUOTE_COLUMNS)
    .eq("user_id", userId)
    .eq("edition_book_id", numericId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeQuoteRow).filter((item): item is UserQuote => !!item);
}

export async function createQuote(
  userId: string,
  input: CreateUserQuoteInput,
): Promise<UserQuote> {
  const { data, error } = await supabase
    .from("user_quotes")
    .insert({
      user_id: userId,
      work_id: input.workId,
      edition_book_id: input.editionBookId,
      language: input.language,
      chapter_stable_id: input.chapterStableId,
      chapter_title: input.chapterTitle ?? null,
      page_number: input.pageNumber,
      block_stable_id: input.blockStableId,
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      selected_text: input.selectedText,
    })
    .select(QUOTE_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("This quote is already saved.");
    }
    throw error;
  }

  const quote = normalizeQuoteRow(data);
  if (!quote) {
    throw new Error("Could not save quote.");
  }
  return quote;
}

export async function deleteQuote(quoteId: string): Promise<void> {
  const { error } = await supabase.from("user_quotes").delete().eq("id", quoteId);
  if (error) throw error;
}
