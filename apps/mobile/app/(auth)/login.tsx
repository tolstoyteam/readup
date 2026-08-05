import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OutlinePillButton } from "@/features/auth/components/outline-pill-button";
import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { otpErrorToTranslationKey } from "@/features/auth/lib/otp-errors";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export default function LoginScreen() {
  const colors = useReadupColors();
  const { signIn, signInWithOAuth, signInWithEmailOtp, isEmailNotConfirmedError } =
    useAuth();
  const { t } = useInterfaceLanguage();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function goToVerify(purpose: "signup" | "login", options?: { cooldown?: "0" | "60" }) {
    router.replace({
      pathname: "/(auth)/verify-email",
      params: {
        email: email.trim(),
        purpose,
        ...(options?.cooldown != null ? { cooldown: options.cooldown } : {}),
      },
    });
  }

  async function onSubmit() {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (isEmailNotConfirmedError(error)) {
          goToVerify("signup", { cooldown: "0" });
          return;
        }
        setErrorMessage(error.message);
        return;
      }
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSignInWithCode() {
    const trimmed = email.trim();
    setErrorMessage(null);
    if (!trimmed) {
      setErrorMessage(t("settings.emailInvalidBody"));
      return;
    }
    setOtpBusy(true);
    try {
      const { error } = await signInWithEmailOtp(trimmed);
      if (error) {
        setErrorMessage(t(otpErrorToTranslationKey(error)));
        return;
      }
      goToVerify("login");
    } finally {
      setOtpBusy(false);
    }
  }

  async function onOAuth(provider: "google" | "apple") {
    setErrorMessage(null);
    setOauthBusy(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      router.replace("/");
    } finally {
      setOauthBusy(null);
    }
  }

  if (!fontsLoaded) {
    return null;
  }

  const busy = submitting || otpBusy || oauthBusy != null;

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
            {t("auth.loginHeadline")}
          </Text>

          <View style={styles.form}>
            <ReadupTextField
              label={t("auth.emailLabel")}
              labelFontFamily="Inter_500Medium"
              value={email}
              onChangeText={setEmail}
              placeholder="example@gmail.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
              style={{ fontFamily: "Inter_400Regular" }}
            />
            <ReadupTextField
              label={t("auth.passwordLabel")}
              labelFontFamily="Inter_500Medium"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              editable={!busy}
              style={{ fontFamily: "Inter_400Regular" }}
            />
          </View>

          <View style={styles.forgotWrap}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              disabled={busy}>
              <Text style={[styles.forgotText, { fontFamily: "Inter_400Regular", color: colors.brand }]}>
                {t("auth.forgotPassword")}
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              numberOfLines={3}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.ctaColumn}>
            <PrimaryButton
              label={t("auth.loginCta")}
              loading={submitting}
              disabled={otpBusy || oauthBusy != null}
              onPress={onSubmit}
              style={styles.primaryBtn}
            />
            <OutlinePillButton
              label={t("auth.loginWithCode")}
              loading={otpBusy}
              disabled={submitting || oauthBusy != null}
              onPress={() => void onSignInWithCode()}
            />
            <OutlinePillButton
              label={t("auth.continueWithGoogle")}
              loading={oauthBusy === "google"}
              disabled={submitting || otpBusy || (oauthBusy != null && oauthBusy !== "google")}
              onPress={() => void onOAuth("google")}
            />
            <OutlinePillButton
              label={t("auth.continueWithApple")}
              loading={oauthBusy === "apple"}
              disabled={submitting || otpBusy || (oauthBusy != null && oauthBusy !== "apple")}
              onPress={() => void onOAuth("apple")}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerMuted, { fontFamily: "Inter_400Regular", color: colors.textSecondary }]}>
              {t("auth.noAccount")}{" "}
            </Text>
            <Link href="/signup" asChild>
              <Pressable
                accessibilityRole="link"
                disabled={busy}
                hitSlop={8}>
                <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular", color: colors.brand }]}>
                  {t("auth.signupLink")}
                </Text>
              </Pressable>
            </Link>
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
    color: ReadupColors.brand,
    letterSpacing: -1.36,
    maxWidth: 338,
    marginBottom: 52,
  },
  form: {
    gap: 16,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  forgotWrap: {
    marginTop: 12,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
    alignItems: "flex-start",
  },
  forgotText: {
    fontSize: 12,
    color: ReadupColors.brand,
    letterSpacing: -0.48,
  },
  errorText: {
    marginTop: 12,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    fontSize: 12,
    color: "#8F0620",
    letterSpacing: -0.48,
  },
  ctaColumn: {
    gap: 12,
    marginTop: 36,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  primaryBtn: {
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    paddingHorizontal: 8,
  },
  footerMuted: {
    fontSize: 14,
    color: "#000000",
  },
  footerLink: {
    fontSize: 14,
    color: ReadupColors.brand,
  },
});
