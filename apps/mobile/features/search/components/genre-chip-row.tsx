import { Pressable, ScrollView, Text, View } from "react-native";

import {
  genreDisplayLabel,
  type GenreOption,
} from "@/features/books/lib/genre-filters";
import { useReadupColors } from "@/shared/constants/readup-theme";
import type { InterfaceLanguage } from "@/shared/i18n/interface-language";

type GenreChipRowProps = {
  label: string;
  genres: GenreOption[];
  language: InterfaceLanguage;
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
};

export function GenreChipRow({
  label,
  genres,
  language,
  selectedSlugs,
  onToggle,
}: GenreChipRowProps) {
  const colors = useReadupColors();

  return (
    <View className="gap-2">
      <Text className="px-8 text-[13px] font-medium tracking-[-0.52px] text-[#4A5550] dark:text-[#B8C1BB]">
        {label}
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-8"
      >
        {genres.map((genre) => {
          const active = selectedSlugs.has(genre.slug);
          return (
            <Pressable
              key={genre.slug}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onToggle(genre.slug)}
              className="rounded-full border px-3 py-1.5 active:opacity-80"
              style={{
                borderColor: colors.brand,
                backgroundColor: active ? colors.brand : "transparent",
              }}
            >
              <Text
                className="text-[13px] tracking-[-0.52px]"
                style={{
                  color: active ? colors.textInverse : colors.text,
                }}
              >
                {genreDisplayLabel(genre, language)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
