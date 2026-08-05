import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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

import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { authErrorToTranslationKey } from "@/features/auth/lib/auth-errors";
import {
  looksLikeEmail,
  normalizeEmail,
} from "@/features/auth/lib/password-validation";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export default function ForgotPasswordScreen() {
  const colors = useReadupColors();
  const { requestPasswordReset } = useAuth();
  const { t } = useInterfaceLanguage();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [email, setEmail] = useState(initialEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function onSubmit() {
    if (submittingRef.current) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    const normalized = normalizeEmail(email);
    if (!looksLikeEmail(normalized)) {
      setErrorMessage(t("auth.emailInvalid"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { error } = await requestPasswordReset(normalized);
      if (error) {
        setErrorMessage(t(authErrorToTranslationKey(error, "generic")));
        return;
      }
      // Anti-enumeration: same success path whether or not the email exists.
      setSuccessMessage(t("auth.forgotPasswordSuccess"));
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: normalized, purpose: "recovery" },
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!fontsLoaded) {
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
            {t("auth.forgotPasswordHeadline")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { fontFamily: "Inter_400Regular", color: colors.textSecondary },
            ]}>
            {t("auth.forgotPasswordSubtitle")}
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
              editable={!submitting}
              style={{ fontFamily: "Inter_400Regular" }}
            />
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
              label={t("auth.forgotPasswordCta")}
              loading={submitting}
              disabled={submitting}
              onPress={() => void onSubmit()}
              style={styles.primaryBtn}
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="link"
              disabled={submitting}
              hitSlop={8}
              onPress={() => router.replace("/(auth)/login")}>
              <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular", color: colors.brand }]}>
                {t("auth.loginCta")}
              </Text>
            </Pressable>
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
  footer: {
    marginTop: 28,
    alignItems: "center",
  },
  footerLink: {
    fontSize: 14,
    color: ReadupColors.brand,
  },
});
