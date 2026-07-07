import { Image } from "expo-image";
import { BookOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export type BookCoverVariant = "thumbnail" | "listenHero" | "detail";

type BookCoverImageProps = {
  uri: string | null;
  title: string;
  variant: BookCoverVariant;
  className?: string;
};

const VARIANT_CONFIG: Record<
  BookCoverVariant,
  { width: number; height: number; borderRadius: number; showIcon: boolean }
> = {
  thumbnail: { width: 48, height: 48, borderRadius: 6, showIcon: false },
  listenHero: { width: 220, height: 220, borderRadius: 16, showIcon: true },
  detail: { width: 190, height: 274, borderRadius: 16, showIcon: false },
};

function CoverPlaceholder({
  title,
  width,
  height,
  borderRadius,
  showIcon,
}: {
  title: string;
  width: number;
  height: number;
  borderRadius: number;
  showIcon: boolean;
}) {
  const colors = useReadupColors();

  return (
    <View
      className={`items-center justify-center ${
        width <= 48
          ? "bg-[#E8E6D8] dark:bg-[#26302B]"
          : "bg-[#F2F0E6] dark:bg-[#19211D]"
      }`}
      style={{ width, height, borderRadius }}
    >
      {showIcon ? (
        <BookOpen size={56} color={colors.textTertiary} strokeWidth={1.5} />
      ) : width <= 48 ? null : (
        <Text
          className="px-2 text-center text-[11px] font-medium text-[#4A5550] dark:text-[#B8C1BB]"
          numberOfLines={variantTitleLines(width)}
        >
          {title}
        </Text>
      )}
    </View>
  );
}

function variantTitleLines(width: number): number {
  if (width <= 48) return 3;
  if (width <= 100) return 4;
  return 5;
}

export function BookCoverImage({
  uri,
  title,
  variant,
  className,
}: BookCoverImageProps) {
  const { t } = useInterfaceLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const [failed, setFailed] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const width =
    variant === "listenHero"
      ? Math.min(Math.max(screenWidth - 48, config.width), 280)
      : config.width;
  const height = variant === "listenHero" ? width : config.height;

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = Boolean(uri) && !failed;

  return (
    <View
      className={`overflow-hidden ${className ?? ""}`}
      style={{ width, height, borderRadius: config.borderRadius }}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          recyclingKey={uri!}
          accessibilityLabel={t("reader.bookCover")}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
        />
      ) : (
        <CoverPlaceholder
          title={title}
          width={width}
          height={height}
          borderRadius={config.borderRadius}
          showIcon={config.showIcon}
        />
      )}
    </View>
  );
}
