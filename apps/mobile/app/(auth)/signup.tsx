import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Link, router } from "expo-router";
import * as Linking from "expo-linking";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OutlinePillButton } from "@/features/auth/components/outline-pill-button";
import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { authErrorToTranslationKey } from "@/features/auth/lib/auth-errors";
import {
  isPasswordLongEnough,
  looksLikeEmail,
  normalizeEmail,
  passwordsMatch,
  validateNewPassword,
} from "@/features/auth/lib/password-validation";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import type { TranslationKey } from "@/shared/i18n/translations";

const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "https://readup.kz/privacy";

function passwordIssueKey(
  issue: ReturnType<typeof validateNewPassword>,
): TranslationKey | null {
  if (issue === "too_short") return "auth.passwordTooShort";
  if (issue === "empty_confirm") return "auth.passwordConfirmEmpty";
  if (issue === "mismatch") return "auth.passwordMismatch";
  return null;
}

export default function SignupScreen() {
  const colors = useReadupColors();
  const { signUp, signInWithOAuth } = useAuth();
  const { t } = useInterfaceLanguage();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailHasError, setEmailHasError] = useState(false);
  const submittingRef = useRef(false);

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

  const canSubmit =
    privacyAccepted &&
    fullName.trim().length > 0 &&
    looksLikeEmail(normalizeEmail(email)) &&
    validateNewPassword(password, confirmPassword) == null;

  async function onSubmit() {
    if (submittingRef.current) return;
    setErrorMessage(null);
    setEmailHasError(false);
    if (!privacyAccepted) {
      setErrorMessage(t("auth.privacyRequired"));
      return;
    }
    const issue = validateNewPassword(password, confirmPassword);
    const issueKey = passwordIssueKey(issue);
    if (issueKey) {
      setErrorMessage(t(issueKey));
      return;
    }
    const normalized = normalizeEmail(email);
    if (!looksLikeEmail(normalized)) {
      setErrorMessage(t("auth.emailInvalid"));
      setEmailHasError(true);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { error, needsEmailVerification, alreadyRegistered } = await signUp(
        normalized,
        password,
        { fullName: fullName.trim() },
      );
      if (alreadyRegistered) {
        setEmailHasError(true);
        setErrorMessage(t("auth.emailAlreadyExistsDetail", { email: normalized }));
        return;
      }
      if (error) {
        setErrorMessage(t(authErrorToTranslationKey(error, "signup")));
        return;
      }
      if (needsEmailVerification) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: normalized, purpose: "signup" },
        });
        return;
      }
      router.replace("/(setup)/interests");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
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
      router.replace("/(setup)/interests");
    } finally {
      setOauthBusy(null);
    }
  }

  function openPrivacy() {
    void Linking.openURL(PRIVACY_POLICY_URL);
  }

  if (!fontsLoaded) {
    return null;
  }

  const busy = submitting || oauthBusy != null;

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

          <Text style={[styles.headline, { fontFamily: "Inter_800ExtraBold", color: colors.brand }]}>
            {t("auth.createAccount")}
          </Text>

          <View style={styles.form}>
            <ReadupTextField
              label={t("auth.fullNameLabel")}
              labelFontFamily="Inter_500Medium"
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("auth.fullNamePlaceholder")}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!busy}
              style={{ fontFamily: "Inter_400Regular" }}
            />
            <ReadupTextField
              label={t("auth.emailLabel")}
              labelFontFamily="Inter_500Medium"
              value={email}
              onChangeText={(next) => {
                setEmail(next);
                if (emailHasError) setEmailHasError(false);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="example@gmail.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
              error={emailHasError}
              style={{ fontFamily: "Inter_400Regular" }}
            />
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
              editable={!busy}
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
              editable={!busy}
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

          <View style={styles.consentRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacyAccepted }}
              disabled={busy}
              hitSlop={6}
              onPress={() => setPrivacyAccepted((v) => !v)}
              style={styles.consentCheckboxHit}>
              <View
                style={[
                  styles.consentCheckbox,
                  {
                    backgroundColor: privacyAccepted
                      ? colors.brand
                      : colors.elevated,
                    borderColor: privacyAccepted ? colors.brand : colors.border,
                  },
                ]}
              >
                {privacyAccepted ? (
                  <Check size={12} color={colors.textInverse} strokeWidth={3} />
                ) : null}
              </View>
            </Pressable>
            <Text
              style={[
                styles.consentText,
                { fontFamily: "Inter_400Regular", color: colors.textSecondary },
              ]}>
              <Text onPress={() => !busy && setPrivacyAccepted((v) => !v)}>
                {t("auth.privacyAgreement")}
              </Text>
              <Text
                style={[styles.consentLink, { color: colors.info }]}
                onPress={() => !busy && openPrivacy()}>
                {t("auth.privacyPolicy")}
              </Text>
            </Text>
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              numberOfLines={4}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.ctaColumn}>
            <PrimaryButton
              label={t("auth.signupCta")}
              loading={submitting}
              disabled={oauthBusy != null || !canSubmit}
              onPress={onSubmit}
              style={styles.primaryBtn}
            />
            <OutlinePillButton
              label={t("auth.continueWithGoogle")}
              loading={oauthBusy === "google"}
              disabled={submitting || (oauthBusy != null && oauthBusy !== "google")}
              onPress={() => void onOAuth("google")}
            />
            <OutlinePillButton
              label={t("auth.continueWithApple")}
              loading={oauthBusy === "apple"}
              disabled={submitting || (oauthBusy != null && oauthBusy !== "apple")}
              onPress={() => void onOAuth("apple")}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerMuted, { fontFamily: "Inter_400Regular", color: colors.textSecondary }]}>
              {t("auth.alreadyHaveAccount")}{" "}
            </Text>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="link" disabled={busy} hitSlop={8}>
                <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular", color: colors.brand }]}>
                  {t("auth.loginCta")}
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
  hintText: {
    marginTop: -4,
    fontSize: 12,
    letterSpacing: -0.48,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    paddingRight: 8,
  },
  consentCheckboxHit: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  consentCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  consentText: {
    flex: 1,
    flexWrap: "wrap",
    fontSize: 12,
    letterSpacing: -0.48,
    lineHeight: 16,
  },
  consentLink: {
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
    marginTop: 28,
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
    color: ReadupColors.text,
  },
  footerLink: {
    fontSize: 14,
    color: ReadupColors.brand,
  },
});
