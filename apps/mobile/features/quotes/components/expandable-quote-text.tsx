import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLLAPSED_LINES = 4;

type ExpandableQuoteTextProps = {
  text: string;
  footerActions?: ReactNode;
};

function estimateNeedsCollapse(text: string): boolean {
  return text.length > 140 || text.split("\n").length > COLLAPSED_LINES;
}

export function ExpandableQuoteText({ text, footerActions }: ExpandableQuoteTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(() => estimateNeedsCollapse(text));

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  }

  return (
    <View>
      <Text
        className="font-reader text-[15px] leading-6 tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]"
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        ellipsizeMode="tail"
        onTextLayout={(event) => {
          if (expanded) return;
          const lineCount = event.nativeEvent.lines.length;
          setIsTruncated(lineCount >= COLLAPSED_LINES || estimateNeedsCollapse(text));
        }}
      >
        {text}
      </Text>

      {isTruncated || footerActions ? (
        <View className="mt-2 flex-row items-center justify-end gap-3">
          {footerActions}
          {isTruncated ? (
            <Pressable
              onPress={toggleExpanded}
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Collapse quote" : "Expand quote"}
              className="h-8 w-8 items-center justify-center rounded-full border border-[#E8E6D8] bg-[#FBFAF2] dark:border-[#2A3630] dark:bg-[#101512] active:opacity-80"
            >
              {expanded ? (
                <ChevronUp size={16} color="#4A5550" strokeWidth={2.25} />
              ) : (
                <ChevronDown size={16} color="#4A5550" strokeWidth={2.25} />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
