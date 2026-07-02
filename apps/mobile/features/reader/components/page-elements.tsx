import type { BookPageElement } from "@readup/db";
import { HighlightableTextBlock } from "@/features/quotes/components/highlightable-text-block";
import type { QuoteRange } from "@/features/quotes/lib/quote-types";
import { useReaderSettings } from "@/features/reader/settings/reader-settings-context";
import { useMemo } from "react";
import { Text, View, type TextStyle } from "react-native";

function KeywordsBlock({
  items,
  textStyle,
}: {
  items: string[];
  textStyle: TextStyle;
}) {
  return (
    <View className="mb-4 mt-2 flex-row flex-wrap gap-2.5">
      {items.map((kw, i) => (
        <View
          key={`${kw}-${i}`}
          className="rounded-full border border-[#059669] dark:border-[#34D399] bg-[#FBFAF2] dark:bg-[#101512] px-3.5 py-2"
        >
          <Text
            className="font-reader text-[#1A2420] dark:text-[#F3F4EE]"
            style={textStyle}
          >
            {kw}
          </Text>
        </View>
      ))}
    </View>
  );
}

function getBlockStableId(
  element: BookPageElement,
  index: number,
  bookIdFallback: string,
  pageNumber: number,
): string {
  if (element.type !== "text" && element.type !== "quote") return "";
  return (
    element.block_stable_id ??
    `legacy:${bookIdFallback}:${pageNumber}:${index}`
  );
}

type PageElementsProps = {
  elements: BookPageElement[];
  bookId?: string;
  pageNumber?: number;
  highlightsByBlockId?: Map<string, QuoteRange[]>;
  selectingBlockId?: string | null;
  onBlockLongPress?: (blockStableId: string) => void;
  onSelectionChange?: (
    blockStableId: string,
    start: number,
    end: number,
    selectedText: string,
  ) => void;
  onBlockLayoutY?: (blockStableId: string, y: number) => void;
  onSelectionDismiss?: () => void;
};

export function PageElements({
  elements,
  bookId = "",
  pageNumber = 1,
  highlightsByBlockId,
  selectingBlockId = null,
  onBlockLongPress,
  onSelectionChange,
  onBlockLayoutY,
  onSelectionDismiss,
}: PageElementsProps) {
  const { settings } = useReaderSettings();
  const { fontScale, lineSpacing } = settings;

  const styles = useMemo(() => {
    const size = (base: number) => Math.round(base * fontScale);
    const height = (base: number) => Math.round(base * fontScale * lineSpacing);
    return {
      chapter: { fontSize: size(26), lineHeight: height(32) } as TextStyle,
      text: { fontSize: size(17), lineHeight: height(28) } as TextStyle,
      quoteMark: { fontSize: size(22), lineHeight: height(24) } as TextStyle,
      quote: { fontSize: size(19), lineHeight: height(30) } as TextStyle,
      keyword: { fontSize: size(14), lineHeight: height(20) } as TextStyle,
    };
  }, [fontScale, lineSpacing]);

  return (
    <>
      {elements.map((el, i) => {
        switch (el.type) {
          case "chapter_name":
            return (
              <Text
                key={i}
                className="mb-7 font-reader font-bold text-[#1A2420] dark:text-[#F3F4EE]"
                style={styles.chapter}
              >
                {el.content}
              </Text>
            );
          case "text": {
            const blockStableId = getBlockStableId(el, i, bookId, pageNumber);
            return (
              <View key={i} className="mb-5">
                <HighlightableTextBlock
                  blockStableId={blockStableId}
                  text={el.content}
                  textStyle={styles.text}
                  textClassName="font-reader text-[#1A2420] dark:text-[#F3F4EE]"
                  highlights={highlightsByBlockId?.get(blockStableId)}
                  isSelecting={selectingBlockId === blockStableId}
                  onLongPress={onBlockLongPress}
                  onSelectionChange={onSelectionChange}
                  onLayoutY={onBlockLayoutY}
                  onSelectionDismiss={onSelectionDismiss}
                />
              </View>
            );
          }
          case "quote": {
            const blockStableId = getBlockStableId(el, i, bookId, pageNumber);
            return (
              <View key={i} className="mb-6">
                <Text
                  className="mb-2 ml-0.5 font-reader text-[#7A7868] dark:text-[#8F9A93]"
                  style={styles.quoteMark}
                >
                  ❞
                </Text>
                <View className="rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-[18px] py-4">
                  <HighlightableTextBlock
                    blockStableId={blockStableId}
                    text={el.content}
                    textStyle={styles.quote}
                    textClassName="font-reader font-medium text-[#1A2420] dark:text-[#F3F4EE]"
                    highlights={highlightsByBlockId?.get(blockStableId)}
                    isSelecting={selectingBlockId === blockStableId}
                    onLongPress={onBlockLongPress}
                    onSelectionChange={onSelectionChange}
                    onLayoutY={onBlockLayoutY}
                    onSelectionDismiss={onSelectionDismiss}
                  />
                </View>
              </View>
            );
          }
          case "keywords":
            return (
              <KeywordsBlock
                key={i}
                items={el.content}
                textStyle={styles.keyword}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
