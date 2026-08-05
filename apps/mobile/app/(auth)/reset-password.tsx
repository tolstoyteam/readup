import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { authErrorToTranslationKey } from "@/features/auth/lib/auth-errors";
import {
  isPasswordLongEnough,
  passwordsMatch,
  validateNewPassword,
} from "@/features/auth/lib/password-validation";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import type { TranslationKey } from "@/shared/i18n/translations";

function passwordIssueKey(
  issue: ReturnType<typeof validateNewPassword>,
): TranslationKey | null {
  if (issue === "too_short") return "auth.passwordTooShort";
  if (issue === "empty_confirm") return "auth.passwordConfirmEmpty";
  if (issue === "mismatch") return "auth.passwordMismatch";
  return null;
}

export default function ResetPasswordScreen() {
  const colors = useReadupColors();
  const { session, loading, updatePassword } = useAuth();
  const { t } = useInterfaceLanguage();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (session == null) {
      router.replace("/(auth)/forgot-password");
    }
  }, [loading, session]);

  const passwordHint = useMemo(() => {
    if (password.length === 0 && confirmPassword.length === 0) return null;
    if (password.length > 0 && !isPasswordLongEnough(password)) {
      return { key: "auth.passwordTooShort" as const, tone: "error" as const };
    }
    if (confirmPassword.length === 0) {
      return password.length > 0
        ? { key: "auth.passwordConfirmEmpty" as const, tone: "muted" as const }
        : null;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      return { key: "auth.passwordMismatch" as const, tone: "error" as const };
    }
    return { key: "auth.passwordMatch" as const, tone: "ok" as const };
  }, [confirmPassword, password]);

  const canSubmit = validateNewPassword(password, confirmPassword) == null;

  async function onSubmit() {
    if (submittingRef.current) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    const issue = validateNewPassword(password, confirmPassword);
    const issueKey = passwordIssueKey(issue);
    if (issueKey) {
      setErrorMessage(t(issueKey));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMessage(t(authErrorToTranslationKey(error, "reset")));
        return;
      }
      setSuccessMessage(t("auth.passwordUpdated"));
      router.replace("/");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!fontsLoaded || loading || session == null) {
    return null;
  }

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
            {t("auth.resetPasswordHeadline")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { fontFamily: "Inter_400Regular", color: colors.textSecondary },
            ]}>
            {t("auth.resetPasswordSubtitle")}
          </Text>

          <View style={styles.form}>
            <ReadupTextField
              label={t("auth.passwordSignupLabel")}
              labelFontFamily="Inter_500Medium"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!submitting}
              style={{ fontFamily: "Inter_400Regular" }}
            />
            <ReadupTextField
              label={t("auth.confirmPasswordLabel")}
              labelFontFamily="Inter_500Medium"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!submitting}
              style={{ fontFamily: "Inter_400Regular" }}
            />
            {passwordHint ? (
              <Text
                style={[
                  styles.hintText,
                  {
                    fontFamily: "Inter_400Regular",
                    color:
                      passwordHint.tone === "ok"
                        ? colors.brand
                        : passwordHint.tone === "error"
                          ? "#8F0620"
                          : colors.textSecondary,
                  },
                ]}
                accessibilityLiveRegion="polite">
                {t(passwordHint.key)}
              </Text>
            ) : null}
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              accessibilityLiveRegion="polite"
              numberOfLines={3}>
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
              label={t("auth.resetPasswordCta")}
              loading={submitting}
              disabled={!canSubmit || submitting}
              onPress={() => void onSubmit()}
              style={styles.primaryBtn}
            />
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
  form: {
    gap: 16,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  hintText: {
    marginTop: -4,
    fontSize: 12,
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
    textAlign: "center",
  },
  successText: {
    marginTop: 12,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    fontSize: 12,
    letterSpacing: -0.48,
    textAlign: "center",
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
});
