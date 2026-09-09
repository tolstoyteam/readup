import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Link, router, useLocalSearchParams } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { OutlinePillButton } from "@/features/auth/components/outline-pill-button";
import { AuthSheetCloseButton } from "@/features/auth/components/auth-sheet-close-button";
import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import {
  authReturnToParams,
  parseAuthReturnTo,
} from "@/features/auth/lib/auth-return-route";
import { authErrorToTranslationKey } from "@/features/auth/lib/auth-errors";
import { normalizeEmail } from "@/features/auth/lib/password-validation";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export default function LoginScreen() {
  const colors = useReadupColors();
  const { signIn, signInWithOAuth, isEmailNotConfirmedError } = useAuth();
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function goToVerify(options?: { cooldown?: "0" | "60" }) {
    router.replace({
      pathname: "/(auth)/verify-email",
      params: {
        email: normalizeEmail(email),
        purpose: "signup",
        ...authReturnToParams(returnTo),
        ...(options?.cooldown != null ? { cooldown: options.cooldown } : {}),
      },
    });
  }

  async function onSubmit() {
    if (submittingRef.current) return;
    setErrorMessage(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { error } = await signIn(normalizeEmail(email), password);
      if (error) {
        if (isEmailNotConfirmedError(error)) {
          goToVerify({ cooldown: "0" });
          return;
        }
        setErrorMessage(t(authErrorToTranslationKey(error, "login")));
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
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      router.replace(returnTo ?? "/");
    } finally {
      setOauthBusy(null);
    }
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
              { fontFamily: "Inter_800ExtraBold", color: colors.brand },
            ]}
          >
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
              secureToggle
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
              disabled={busy}
              onPress={() => {
                router.push({
                  pathname: "/(auth)/forgot-password",
                  params: email.trim()
                    ? {
                        email: normalizeEmail(email),
                        ...authReturnToParams(returnTo),
                      }
                    : authReturnToParams(returnTo),
                });
              }}
            >
              <Text
                style={[
                  styles.forgotText,
                  { fontFamily: "Inter_400Regular", color: colors.brand },
                ]}
              >
                {t("auth.forgotPassword")}
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text
              style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}
              numberOfLines={3}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.ctaColumn}>
            <PrimaryButton
              label={t("auth.loginCta")}
              loading={submitting}
              disabled={oauthBusy != null}
              onPress={onSubmit}
              style={styles.primaryBtn}
            />
            <OutlinePillButton
              label={t("auth.continueWithGoogle")}
              loading={oauthBusy === "google"}
              disabled={
                submitting || (oauthBusy != null && oauthBusy !== "google")
              }
              onPress={() => void onOAuth("google")}
            />
            <OutlinePillButton
              label={t("auth.continueWithApple")}
              loading={oauthBusy === "apple"}
              disabled={
                submitting || (oauthBusy != null && oauthBusy !== "apple")
              }
              onPress={() => void onOAuth("apple")}
            />
          </View>

          <View style={styles.footer}>
            <Text
              style={[
                styles.footerMuted,
                { fontFamily: "Inter_400Regular", color: colors.textSecondary },
              ]}
            >
              {t("auth.noAccount")}{" "}
            </Text>
            <Link
              href={{
                pathname: "/(auth)/signup",
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
  loading: {
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginBottom: 20,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  headline: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: ReadupColors.brand,
    letterSpacing: -1.36,
    maxWidth: 338,
    marginBottom: 36,
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
