import { buildHighlightSegments } from "@/features/quotes/lib/build-highlight-segments";
import type { QuoteRange } from "@/features/quotes/lib/quote-types";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
  type TextStyle,
} from "react-native";

const HIGHLIGHT_LIGHT = "rgba(255, 236, 179, 0.55)";
const HIGHLIGHT_DARK = "rgba(255, 214, 102, 0.28)";
const EMPHASIS_LIGHT = "rgba(255, 214, 102, 0.9)";
const EMPHASIS_DARK = "rgba(255, 214, 102, 0.55)";

type HighlightableTextBlockProps = {
  blockStableId: string;
  text: string;
  textStyle: TextStyle;
  textClassName: string;
  highlights?: QuoteRange[];
  isSelecting?: boolean;
  onLongPress?: (blockStableId: string) => void;
  onSelectionChange?: (
    blockStableId: string,
    start: number,
    end: number,
    selectedText: string,
  ) => void;
  onLayoutY?: (blockStableId: string, y: number) => void;
  onSelectionDismiss?: () => void;
};

export function HighlightableTextBlock({
  blockStableId,
  text,
  textStyle,
  textClassName,
  highlights = [],
  isSelecting = false,
  onLongPress,
  onSelectionChange,
  onLayoutY,
  onSelectionDismiss,
}: HighlightableTextBlockProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [emphasisActive, setEmphasisActive] = useState(false);

  const hasEmphasis = highlights.some((range) => range.emphasize);

  useEffect(() => {
    if (!hasEmphasis) {
      setEmphasisActive(false);
      return;
    }
    setEmphasisActive(true);
    const timer = setTimeout(() => setEmphasisActive(false), 1200);
    return () => clearTimeout(timer);
  }, [hasEmphasis, blockStableId]);

  useEffect(() => {
    if (!isSelecting) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      setSelection({ start: 0, end: Math.min(text.length, 1) });
    }, 50);
    return () => clearTimeout(timer);
  }, [isSelecting, text.length]);

  function handleSelectionChange(
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) {
    const { start, end } = event.nativeEvent.selection;
    setSelection({ start, end });
    const selectedText = text.slice(start, end);
    onSelectionChange?.(blockStableId, start, end, selectedText);
  }

  const segments = buildHighlightSegments(text, highlights);

  function highlightColor(emphasize?: boolean) {
    if (emphasize && emphasisActive) {
      return isDark ? EMPHASIS_DARK : EMPHASIS_LIGHT;
    }
    return isDark ? HIGHLIGHT_DARK : HIGHLIGHT_LIGHT;
  }

  if (isSelecting) {
    return (
      <View
        onLayout={(event) => onLayoutY?.(blockStableId, event.nativeEvent.layout.y)}
      >
        <TextInput
          ref={inputRef}
          value={text}
          editable={false}
          multiline
          scrollEnabled={false}
          selection={selection}
          onSelectionChange={handleSelectionChange}
          onBlur={onSelectionDismiss}
          className={textClassName}
          style={[textStyle, { padding: 0, margin: 0 }]}
          selectionColor="#059669"
        />
      </View>
    );
  }

  return (
    <Pressable
      onLongPress={() => onLongPress?.(blockStableId)}
      delayLongPress={280}
      onLayout={(event) => onLayoutY?.(blockStableId, event.nativeEvent.layout.y)}
    >
      <Text className={textClassName} style={textStyle}>
        {segments.map((segment, index) => {
          if (!segment.highlighted) {
            return <Text key={`${blockStableId}-${index}`}>{segment.text}</Text>;
          }
          return (
            <Text
              key={`${blockStableId}-${index}`}
              style={{ backgroundColor: highlightColor(segment.emphasize) }}
            >
              {segment.text}
            </Text>
          );
        })}
      </Text>
    </Pressable>
  );
}
