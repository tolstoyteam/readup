import { Pressable, ScrollView, Text, View } from "react-native";

import type { GenreOption } from "@/features/books/lib/genre-filters";
import { ReadupColors } from "@/shared/constants/readup-theme";

type GenreChipRowProps = {
  label: string;
  genres: GenreOption[];
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
};

export function GenreChipRow({
  label,
  genres,
  selectedSlugs,
  onToggle,
}: GenreChipRowProps) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium tracking-[-0.52px] text-[#4A5550]">
        {label}
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <View className="flex-row gap-2">
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
                  borderColor: ReadupColors.brand,
                  backgroundColor: active ? ReadupColors.brand : "transparent",
                }}
              >
                <Text
                  className="text-[13px] tracking-[-0.52px]"
                  style={{
                    color: active ? ReadupColors.textInverse : ReadupColors.text,
                  }}
                >
                  {genre.labelRu}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
