import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts,
} from "@expo-google-fonts/inter";
import { Image, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { markOnboardingComplete } from "@/shared/lib/onboarding-storage";
import type { TranslationKey } from "@/shared/i18n/translations";

/** Tokens from Figma `readup. design` onboarding-info section (node 55:237). */

/** Reference Figma frame for proportional scaling (node 16:4 page). */
const FIGMA_FRAME_W = 402;
const FIGMA_FRAME_H = 874;

/** Watermark PNG dimensions and per-page anchor (Figma node 16:7 / 16:42 / 16:68). */
const BG_MARK_W = 3951.958;
const BG_MARK_H = 1085.04;
const BG_ANCHOR_Y = FIGMA_FRAME_H / 2 + 209.42;
const BG_ANCHOR_X_BY_PAGE = [
  FIGMA_FRAME_W + 1234.8,
  FIGMA_FRAME_W + 832.81,
  FIGMA_FRAME_W + 430.81,
];

/** Bottom padding for skip/next row vs Figma frame bottom (Figma px). */
const FIGMA_NAV_BOTTOM_INSET = 28;

type OnboardingPage = {
  id: string;
  titleKey: TranslationKey;
  illustration: number | ImageSource;
  /** Figma intrinsic size for the illustration crop (used for aspect ratio). */
  imgW: number;
  imgH: number;
  /** Figma top offset from page top in the 402×874 frame. */
  topOffset: number;
};

const PAGES: OnboardingPage[] = [
  {
    id: "page-1",
    titleKey: "onboarding.page1",
    illustration: require("@/assets/images/onboarding/page-1-clock.png"),
    imgW: 282,
    imgH: 389,
    topOffset: 284,
  },
  {
    id: "page-2",
    titleKey: "onboarding.page2",
    illustration: require("@/assets/images/onboarding/page-2-headphones.png"),
    imgW: 295,
    imgH: 395,
    topOffset: 281,
  },
  {
    id: "page-3",
    titleKey: "onboarding.page3",
    illustration: require("@/assets/images/onboarding/page-3-book-head.png"),
    imgW: 328,
    imgH: 440,
    topOffset: 273,
  },
];

const watermarkAsset = require("@/assets/images/onboarding/readup-logo.png");

export default function OnboardingScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { width, height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  /** Full window maps 1:1 to the 874pt-tall Figma artboard (safe zones are informational only). */
  const scaleY = windowHeight / FIGMA_FRAME_H;
  /** Carousel uses only the region above the footer so the horizontal ScrollView never sits under the tap targets. */
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const pageHeight =
    scrollAreaHeight > 0 ? scrollAreaHeight : Math.max(windowHeight - 96, 240);
  const titleTop = (166 / FIGMA_FRAME_H) * pageHeight;
  const logoTop = Math.max(
    8,
    ((FIGMA_FRAME_H / 2 - 328) / FIGMA_FRAME_H) * pageHeight,
  );
  const navBottomPad = FIGMA_NAV_BOTTOM_INSET * scaleY;

  const scaleX = width / FIGMA_FRAME_W;
  const bgMarkW = BG_MARK_W * scaleX;
  const bgMarkH = BG_MARK_H * scaleX;
  const bgAnchorY = (BG_ANCHOR_Y / FIGMA_FRAME_H) * pageHeight;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / Math.max(width, 1));
      if (idx !== pageIndex) {
        setPageIndex(Math.min(Math.max(idx, 0), PAGES.length - 1));
      }
    },
    [pageIndex, width],
  );

  const goToTabs = useCallback(async () => {
    await markOnboardingComplete();
    router.replace("/(tabs)");
  }, [router]);

  const handleNext = useCallback(async () => {
    if (pageIndex < PAGES.length - 1) {
      const nextIndex = pageIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setPageIndex(nextIndex);
      return;
    }
    await markOnboardingComplete();
    router.replace("/signup");
  }, [pageIndex, router, width]);

  if (!fontsLoaded) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <View style={{ flex: 1, flexDirection: "column" }}>
        <View
          style={{ flex: 1 }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - scrollAreaHeight) > 0.5) {
              setScrollAreaHeight(h);
            }
          }}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceHorizontal={false}
            alwaysBounceVertical={false}
            directionalLockEnabled
            onMomentumScrollEnd={onScroll}
            onScrollEndDrag={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {PAGES.map((page, idx) => {
              const anchorX = BG_ANCHOR_X_BY_PAGE[idx] * scaleX;
              const bgMarkLeft = anchorX - bgMarkW / 2;
              const bgMarkTop = bgAnchorY - bgMarkH / 2;

              const illustrationTop =
                (page.topOffset / FIGMA_FRAME_H) * pageHeight;
              const naturalW = Math.min(page.imgW, width - 32);
              const naturalH = (page.imgH / page.imgW) * naturalW;
              const reservedBottom = (32 / FIGMA_FRAME_H) * pageHeight;
              const availableH = Math.max(
                pageHeight - illustrationTop - reservedBottom,
                160,
              );
              const cappedH = Math.min(naturalH, availableH);
              const cappedW = (page.imgW / page.imgH) * cappedH;

              return (
                <View
                  key={page.id}
                  style={{ width, height: pageHeight }}
                  className="relative overflow-hidden"
                >
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { overflow: "hidden", pointerEvents: "none" },
                    ]}
                  >
                    <Image
                      source={watermarkAsset}
                      pointerEvents="none"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={{
                        position: "absolute",
                        left: bgMarkLeft,
                        top: bgMarkTop,
                        width: bgMarkW,
                        height: bgMarkH,
                      }}
                      contentFit="contain"
                    />
                  </View>

                  <View
                    className="absolute left-0 right-0 items-center"
                    style={{ top: logoTop, pointerEvents: "none" }}
                    accessibilityRole="header"
                    accessibilityLabel="readup."
                  >
                    <ReadupLogo width={66} height={18} />
                  </View>

                  <View
                    className="absolute left-0 right-0 items-center px-6"
                    style={{ top: titleTop, pointerEvents: "none" }}
                  >
                    <Text
                      className="text-center"
                      style={{
                        color: colors.brand,
                        fontFamily: "Inter_500Medium",
                        fontSize: 18,
                        lineHeight: 22,
                        letterSpacing: -0.72,
                        maxWidth: 319,
                      }}
                    >
                      {t(page.titleKey)}
                    </Text>
                  </View>

                  <View
                    className="absolute left-0 right-0 items-center"
                    style={{ top: illustrationTop, pointerEvents: "none" }}
                  >
                    <Image
                      accessibilityIgnoresInvertColors
                      pointerEvents="none"
                      source={page.illustration}
                      style={{ width: cappedW, height: cappedH }}
                      contentFit="contain"
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View
          className="flex-row items-center justify-between px-8 pt-2"
          style={{
            paddingBottom: navBottomPad,
            backgroundColor: colors.background,
            minHeight: 44,
          }}
          collapsable={false}
        >
          <Pressable
            onPress={goToTabs}
            accessibilityRole="button"
            accessibilityLabel={t("common.skip")}
            style={({ pressed }) => [
              styles.footerAction,
              pressed && styles.footerActionPressed,
            ]}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                letterSpacing: -0.48,
              }}
            >
              {t("common.skip")}
            </Text>
          </Pressable>

          <View
            className="flex-row items-center"
            style={{ pointerEvents: "none" }}
          >
            {PAGES.map((p, dotIdx) => (
              <View
                key={p.id}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginLeft: dotIdx === 0 ? 0 : 8,
                  backgroundColor:
                    dotIdx === pageIndex ? colors.text : colors.border,
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.next")}
            style={({ pressed }) => [
              styles.footerAction,
              pressed && styles.footerActionPressed,
            ]}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                letterSpacing: -0.48,
              }}
            >
              {t("onboarding.next")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footerAction: {
    minHeight: 44,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  footerActionPressed: {
    opacity: 0.62,
  },
});
