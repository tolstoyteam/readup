import type { UserQuote } from "@readup/db";
import { ExpandableQuoteText } from "@/features/quotes/components/expandable-quote-text";
import { useQuotes } from "@/features/quotes/hooks/use-quotes";
import {
  logQuoteSourceNavigation,
  quoteSourceReaderPath,
} from "@/features/quotes/lib/quote-source-navigation";
import { useRouter, type Href } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

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
  const { t } = useInterfaceLanguage();

  function openSource() {
    const path = quoteSourceReaderPath(item);
    logQuoteSourceNavigation("navigate to source", {
      quoteId: item.id,
      editionBookId: item.editionBookId,
      language: item.language,
      path,
    });
    router.push(path as Href);
  }

  function confirmDelete() {
    Alert.alert(t("quotes.deleteTitle"), t("quotes.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("quotes.delete"),
        style: "destructive",
        onPress: () => {
          void deleteQuote(item.id).catch(() => {
            Alert.alert(t("quotes.couldNotDelete"), t("common.tryAgain"));
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
            accessibilityLabel={t("quotes.goToSource")}
            className="active:opacity-80"
          >
            <Text className="text-[12px] font-medium tracking-[-0.48px] text-[#059669] dark:text-[#34D399]">
              {t("quotes.goToSource")}
            </Text>
          </Pressable>
        }
      />

      <View className="mt-4 gap-1">
        <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
          {item.bookTitle ?? t("quotes.unknownBook")}
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
          accessibilityLabel={t("quotes.delete")}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
        >
          <Trash2 size={18} color="#7A7868" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
