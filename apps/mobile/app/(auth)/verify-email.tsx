import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OtpInput } from "@/features/auth/components/otp-input";
import {
  type EmailOtpPurpose,
  otpErrorToTranslationKey,
} from "@/features/auth/lib/otp-errors";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

function parsePurpose(raw: string | string[] | undefined): EmailOtpPurpose {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "email_change" || value === "recovery") return value;
  return "signup";
}

function parseEmail(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

export default function VerifyEmailScreen() {
  const colors = useReadupColors();
  const { verifyEmailOtp, resendEmailOtp } = useAuth();
  const { t } = useInterfaceLanguage();
  const params = useLocalSearchParams<{
    email?: string;
    purpose?: string;
    cooldown?: string;
  }>();
  const email = useMemo(() => parseEmail(params.email), [params.email]);
  const purpose = useMemo(() => parsePurpose(params.purpose), [params.purpose]);
  const initialCooldown = useMemo(() => {
    const raw = Array.isArray(params.cooldown) ? params.cooldown[0] : params.cooldown;
    if (raw === "0") return 0;
    return RESEND_COOLDOWN_SECONDS;
  }, [params.cooldown]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(initialCooldown);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const subtitle = useMemo(() => {
    if (purpose === "recovery") {
      return t("auth.otpSubtitleRecovery", { email });
    }
    if (purpose === "email_change") {
      return t("auth.otpSubtitleEmailChange", { email });
    }
    return t("auth.otpSubtitleSignup", { email });
  }, [email, purpose, t]);

  const navigateAfterSuccess = useCallback(() => {
    if (purpose === "recovery") {
      router.replace("/(auth)/reset-password");
      return;
    }
    if (purpose === "email_change") {
      router.replace("/");
      return;
    }
    router.replace("/(setup)/interests");
  }, [purpose]);

  const onVerify = useCallback(
    async (tokenOverride?: string) => {
      const token = (tokenOverride ?? code).trim();
      if (token.length !== OTP_LENGTH || verifyingRef.current) return;
      if (!email) {
        setErrorMessage(t("auth.otpFailed"));
        return;
      }

      verifyingRef.current = true;
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const { error } = await verifyEmailOtp({ email, token, purpose });
        if (error) {
          setErrorMessage(t(otpErrorToTranslationKey(error)));
          return;
        }
        navigateAfterSuccess();
      } finally {
        verifyingRef.current = false;
        setSubmitting(false);
      }
    },
    [code, email, navigateAfterSuccess, purpose, t, verifyEmailOtp],
  );

  async function onResend() {
    if (secondsLeft > 0 || resending || submitting || !email) return;
    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await resendEmailOtp({ email, purpose });
      if (error) {
        setErrorMessage(t(otpErrorToTranslationKey(error)));
        return;
      }
      setCode("");
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setSuccessMessage(t("auth.otpCodeSent"));
    } finally {
      setResending(false);
    }
  }

  if (!fontsLoaded) {
    return null;
  }

  const busy = submitting || resending;
  const canResend = secondsLeft <= 0 && !busy;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoRow}>
            <ReadupLogo width={66} height={18} />
          </View>

          <Text
            style={[
              styles.headline,
              { fontFamily: "Inter_800ExtraBold", color: colors.brand },
            ]}>
            {t("auth.otpTitle")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { fontFamily: "Inter_400Regular", color: colors.textSecondary },
            ]}>
            {subtitle}
          </Text>

          <View style={styles.otpWrap}>
            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              disabled={busy}
              accessibilityLabel={t("auth.otpTitle")}
              onComplete={(full) => {
                void onVerify(full);
              }}
            />
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              accessibilityLiveRegion="polite"
              numberOfLines={4}>
              {errorMessage}
            </Text>
          ) : null}

          {successMessage ? (
            <Text
              style={[
                styles.successText,
                { fontFamily: "Inter_400Regular", color: colors.brand },
              ]}
              accessibilityLiveRegion="polite"
              numberOfLines={3}>
              {successMessage}
            </Text>
          ) : null}

          <View style={styles.ctaColumn}>
            <PrimaryButton
              label={t("auth.otpVerifyCta")}
              loading={submitting}
              disabled={resending || code.length !== OTP_LENGTH}
              onPress={() => void onVerify()}
              style={styles.primaryBtn}
            />
          </View>

          <View style={styles.resendBlock}>
            <Text
              style={[
                styles.resendHint,
                { fontFamily: "Inter_400Regular", color: colors.textSecondary },
              ]}>
              {t("auth.otpDidNotReceive")}
            </Text>
            {canResend ? (
              <Pressable
                accessibilityRole="button"
                disabled={!canResend}
                hitSlop={8}
                onPress={() => void onResend()}
                style={styles.resendButton}>
                {resending ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (
                  <Text
                    style={[
                      styles.resendAction,
                      { fontFamily: "Inter_500Medium", color: colors.brand },
                    ]}>
                    {t("auth.otpResend")}
                  </Text>
                )}
              </Pressable>
            ) : (
              <Text
                style={[
                  styles.resendCooldown,
                  { fontFamily: "Inter_400Regular", color: colors.textTertiary },
                ]}>
                {resending
                  ? t("auth.otpResend")
                  : t("auth.otpResendIn", { seconds: secondsLeft })}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ReadupColors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  logoRow: {
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 28,
  },
  headline: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.36,
    maxWidth: 338,
    marginBottom: 16,
  },
  subtitle: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.4,
    maxWidth: 338,
    marginBottom: 36,
  },
  otpWrap: {
    marginBottom: 16,
  },
  errorText: {
    marginTop: 8,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    fontSize: 12,
    color: "#8F0620",
    letterSpacing: -0.48,
    textAlign: "center",
  },
  successText: {
    marginTop: 8,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    fontSize: 12,
    letterSpacing: -0.48,
    textAlign: "center",
  },
  ctaColumn: {
    gap: 12,
    marginTop: 28,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  primaryBtn: {
    width: "100%",
  },
  resendBlock: {
    marginTop: 28,
    alignItems: "center",
    gap: 8,
  },
  resendHint: {
    fontSize: 14,
    letterSpacing: -0.4,
  },
  resendButton: {
    minHeight: 28,
    justifyContent: "center",
  },
  resendAction: {
    fontSize: 14,
    letterSpacing: -0.4,
  },
  resendCooldown: {
    fontSize: 14,
    letterSpacing: -0.4,
  },
});
