import type { UserQuote } from "@readup/db";
import { ExpandableQuoteText } from "@/features/quotes/components/expandable-quote-text";
import { useQuotes } from "@/features/quotes/hooks/use-quotes";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

export type QuoteCardItem = UserQuote & {
  bookTitle?: string;
};

function formatSavedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QuoteCard({ item }: { item: QuoteCardItem }) {
  const router = useRouter();
  const { deleteQuote } = useQuotes();

  function openSource() {
    router.push(
      `/reader/${encodeURIComponent(String(item.editionBookId))}?focusQuoteId=${encodeURIComponent(item.id)}`,
    );
  }

  function confirmDelete() {
    Alert.alert("Delete quote?", "This will remove the quote and its highlight.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteQuote(item.id).catch(() => {
            Alert.alert("Could not delete quote", "Check your connection and try again.");
          });
        },
      },
    ]);
  }

  return (
    <View className="rounded-[20px] bg-[#F2F0E6] dark:bg-[#19211D] p-4">
      <ExpandableQuoteText
        text={item.selectedText}
        footerActions={
          <Pressable
            onPress={openSource}
            accessibilityRole="button"
            accessibilityLabel="Go to source"
            className="active:opacity-80"
          >
            <Text className="text-[12px] font-medium tracking-[-0.48px] text-[#059669] dark:text-[#34D399]">
              To the source
            </Text>
          </Pressable>
        }
      />

      <View className="mt-4 gap-1">
        <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
          {item.bookTitle ?? "Unknown book"}
        </Text>
        {item.chapterTitle ? (
          <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
            {item.chapterTitle}
          </Text>
        ) : null}
        <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
          {formatSavedDate(item.createdAt)}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-end">
        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete quote"
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
        >
          <Trash2 size={18} color="#7A7868" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
