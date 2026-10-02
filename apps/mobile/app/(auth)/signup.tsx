import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Link, router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useMemo, useRef, useState } from "react";
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
import { Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OutlinePillButton } from "@/features/auth/components/outline-pill-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { AuthSheetCloseButton } from "@/features/auth/components/auth-sheet-close-button";
import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import {
  authReturnToParams,
  parseAuthReturnTo,
} from "@/features/auth/lib/auth-return-route";
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
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = useMemo(
    () => parseAuthReturnTo(params.returnTo),
    [params.returnTo],
  );
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
        setErrorMessage(
          t("auth.emailAlreadyExistsDetail", { email: normalized }),
        );
        return;
      }
      if (error) {
        setErrorMessage(t(authErrorToTranslationKey(error, "signup")));
        return;
      }
      if (needsEmailVerification) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: {
            email: normalized,
            purpose: "signup",
            ...authReturnToParams(returnTo),
          },
        });
        return;
      }
      router.replace(returnTo ?? "/");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function onOAuth(provider: "google" | "apple") {
    setErrorMessage(null);
    setOauthBusy(provider);
    try {
      const { error, authenticated } = await signInWithOAuth(provider);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      if (authenticated) router.replace(returnTo ?? "/");
    } finally {
      setOauthBusy(null);
    }
  }

  function openPrivacy() {
    void Linking.openURL(PRIVACY_POLICY_URL);
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaView
        style={[styles.safe, styles.loading, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator color={colors.brand} size="large" />
      </SafeAreaView>
    );
  }

  const busy = submitting || oauthBusy != null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <ReadupLogo width={66} height={18} />
            <AuthSheetCloseButton />
          </View>

          <Text
            style={[
              styles.headline,
              { fontFamily: "Inter_800ExtraBold", color: colors.text },
            ]}
          >
            {t("auth.createAccount")}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.textSecondary }]}>
            {t("auth.signupSubtitle")}
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
                accessibilityLiveRegion="polite"
              >
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
              style={styles.consentCheckboxHit}
            >
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
              ]}
            >
              <Text onPress={() => !busy && setPrivacyAccepted((v) => !v)}>
                {t("auth.privacyAgreement")}
              </Text>
              <Text
                style={[styles.consentLink, { color: colors.info }]}
                onPress={() => !busy && openPrivacy()}
              >
                {t("auth.privacyPolicy")}
              </Text>
            </Text>
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              numberOfLines={4}
            >
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
            <AuthDivider />
            <OutlinePillButton
              label={t("auth.continueWithGoogle")}
              provider="google"
              loading={oauthBusy === "google"}
              disabled={
                submitting || (oauthBusy != null && oauthBusy !== "google")
              }
              onPress={() => void onOAuth("google")}
            />
            <OutlinePillButton
              label={t("auth.continueWithApple")}
              provider="apple"
              loading={oauthBusy === "apple"}
              disabled={
                submitting || (oauthBusy != null && oauthBusy !== "apple")
              }
              onPress={() => void onOAuth("apple")}
            />
          </View>

        </ScrollView>
          <View style={[styles.footer, { backgroundColor: colors.background }]}>
            <Text
              style={[
                styles.footerMuted,
                { fontFamily: "Inter_400Regular", color: colors.textSecondary },
              ]}
            >
              {t("auth.alreadyHaveAccount")}{" "}
            </Text>
            <Link
              href={{
                pathname: "/(auth)/login",
                params: authReturnToParams(returnTo),
              }}
              asChild
            >
              <Pressable accessibilityRole="link" disabled={busy} hitSlop={8}>
                <Text
                  style={[
                    styles.footerLink,
                    { fontFamily: "Inter_400Regular", color: colors.brand },
                  ]}
                >
                  {t("auth.loginCta")}
                </Text>
              </Pressable>
            </Link>
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ReadupColors.background,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  logoRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 30,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  headline: {
    alignSelf: "center",
    textAlign: "left",
    fontSize: 32,
    fontWeight: "800",
    color: ReadupColors.text,
    letterSpacing: -1.1,
    lineHeight: 39,
    width: "100%",
    maxWidth: 420,
  },
  subtitle: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },
  form: {
    gap: 14,
    width: "100%",
    maxWidth: 420,
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
    maxWidth: 420,
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
    fontSize: 13,
    lineHeight: 19,
  },
  consentLink: {
    letterSpacing: -0.48,
  },
  errorText: {
    marginTop: 12,
    alignSelf: "center",
    maxWidth: 420,
    width: "100%",
    fontSize: 12,
    color: "#8F0620",
    letterSpacing: -0.48,
  },
  ctaColumn: {
    gap: 12,
    marginTop: 24,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 14,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 24,
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
