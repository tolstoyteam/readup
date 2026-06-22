import {
  Inter_500Medium,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { markOnboardingComplete } from "@/shared/lib/onboarding-storage";

/** Tokens from Figma `readup. design` welcome frame (node 10:100). */

/**
 * Figma node `10:127` — watermark PNG: 3951.958×1085.04, anchor
 * `left = 100% + 1234.8px`, `top = 50% + 209.42px`, then `-translate(50%, 50%)`.
 */
const FIGMA_FRAME_W = 402;
const FIGMA_FRAME_H = 874;
const BG_MARK_W = 3951.958;
const BG_MARK_H = 1085.04;
const BG_ANCHOR_X = FIGMA_FRAME_W + 1234.8;
const BG_ANCHOR_Y = FIGMA_FRAME_H / 2 + 209.42;

/** Figma node 10:117 — logo block top offset in the 874px-tall frame. */
const FIGMA_LOGO_TOP = FIGMA_FRAME_H / 2 - 337;
/** Space from frame bottom to primary CTA baseline (Figma px, approximate). */
const FIGMA_CTA_BOTTOM_INSET = 52;

export default function WelcomeScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { width, height: windowHeight } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Inter_800ExtraBold,
  });

  const illustration = require("@/assets/images/onboarding/welcome-illustration.png");
  const readupLogoBg = require("@/assets/images/onboarding/readup-logo.png");
  /** Scale Figma Y positions to the device using the full frame height (874). */
  const scaleY = windowHeight / FIGMA_FRAME_H;
  const rawImgW = Math.min(318, width - 48);
  const rawImgH = (426 / 318) * rawImgW;
  /** Keep hero inside the viewport (non-scroll layout). */
  const maxIllustrationH = Math.min(rawImgH, windowHeight * 0.8);
  const [illustrationSlotH, setIllustrationSlotH] = useState(0);
  const imgH =
    illustrationSlotH > 0
      ? Math.min(maxIllustrationH, illustrationSlotH)
      : maxIllustrationH;
  const imgW = (318 / 426) * imgH;

  const logoPaddingTop = Math.max(8, Math.round(FIGMA_LOGO_TOP * scaleY));
  const scaleX = width / FIGMA_FRAME_W;
  const bgMarkW = BG_MARK_W * scaleX;
  const bgMarkH = BG_MARK_H * scaleX;
  const anchorX = BG_ANCHOR_X * scaleX;
  const anchorY = BG_ANCHOR_Y * scaleY;
  const bgMarkLeft = anchorX - bgMarkW / 2;
  const bgMarkTop = anchorY - bgMarkH / 2;

  const onStart = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  const onLogin = useCallback(async () => {
    await markOnboardingComplete();
    router.push("/login");
  }, [router]);

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
      <View style={styles.layerRoot}>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
        >
          <Image
            source={readupLogoBg}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              left: bgMarkLeft,
              top: bgMarkTop,
              width: bgMarkW,
              height: bgMarkH,
              opacity: colorScheme === "dark" ? 0.18 : 1,
            }}
            contentFit="contain"
          />
        </View>

        <View style={styles.contentOnTop} className="flex-1">
          <View
            className="items-center px-6"
            style={{ paddingTop: logoPaddingTop }}
            accessibilityRole="header"
            accessibilityLabel="readup."
          >
            <ReadupLogo width={66} height={18} />

            <Text
              className="max-w-[320px] text-center text-[34px] text-[#059669] dark:text-[#34D399]"
              style={{
                fontFamily: "Inter_800ExtraBold",
                letterSpacing: -1.36,
                lineHeight: 38,
                marginTop: 48,
              }}
            >
              Читай меньше.{"\n"}Знай больше
            </Text>
          </View>

          <View
            className="min-h-0 flex-1 justify-center overflow-hidden px-5 pb-2"
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) setIllustrationSlotH(h);
            }}
          >
            <Image
              accessibilityIgnoresInvertColors
              pointerEvents="none"
              source={illustration}
              style={{
                width: imgW,
                height: imgH,
                alignSelf: "center",
                borderRadius: 12,
              }}
              contentFit="cover"
            />
          </View>

          <View
            className="px-6 pt-2"
            style={{
              paddingBottom: FIGMA_CTA_BOTTOM_INSET * scaleY,
              zIndex: 2,
              elevation: 4,
            }}
            collapsable={false}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Начать"
              onPress={onStart}
              activeOpacity={0.95}
              style={[
                styles.primaryCta,
                {
                  backgroundColor: colors.brandDark,
                  borderColor: colors.brand,
                },
              ]}
            >
              <Text
                style={{
                  color: "#fbfaf2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 18,
                  letterSpacing: -0.72,
                }}
              >
                Начать
              </Text>
            </TouchableOpacity>

            <View className="mt-6 flex-row flex-wrap items-center justify-center">
              <Text
                className="text-[18px]"
                style={{
                  color: colors.text,
                  fontFamily: "Inter_500Medium",
                  letterSpacing: -0.72,
                }}
              >
                Есть аккаунт?{" "}
              </Text>
              <Pressable
                onPress={onLogin}
                hitSlop={12}
                accessibilityRole="link"
              >
                <Text
                  className="text-[18px]"
                  style={{
                    color: colors.brand,
                    fontFamily: "Inter_500Medium",
                    letterSpacing: -0.72,
                  }}
                >
                  Войти
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layerRoot: {
    flex: 1,
    overflow: "hidden",
  },
  contentOnTop: {
    zIndex: 1,
  },
  primaryCta: {
    height: 54,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
    borderRadius: 100,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
});
