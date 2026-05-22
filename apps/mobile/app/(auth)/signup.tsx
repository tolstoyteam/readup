import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Link, router } from "expo-router";
import * as Linking from "expo-linking";
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
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "https://readup.app/privacy";

export default function SignupScreen() {
  const { signUp, signInWithOAuth } = useAuth();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_800ExtraBold,
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit() {
    setErrorMessage(null);
    if (!privacyAccepted) {
      setErrorMessage("Подтвердите согласие с политикой конфиденциальности.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await signUp(email.trim(), password, {
        fullName: fullName.trim(),
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      router.replace("/(setup)/interests");
    } finally {
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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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

          <Text style={[styles.headline, { fontFamily: "Inter_800ExtraBold" }]}>
            Создайте аккаунт
          </Text>

          <View style={styles.form}>
            <ReadupTextField
              label="Как вас зовут?"
              labelFontFamily="Inter_500Medium"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Имя Фамилия"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!busy}
              style={{ fontFamily: "Inter_400Regular" }}
            />
            <ReadupTextField
              label="Ваша почта"
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
              label="Придумайте пароль"
              labelFontFamily="Inter_500Medium"
              value={password}
              onChangeText={setPassword}
              placeholder="*******"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!busy}
              style={{ fontFamily: "Inter_400Regular" }}
            />
          </View>

          <View style={styles.consentRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacyAccepted }}
              disabled={busy}
              hitSlop={6}
              onPress={() => setPrivacyAccepted((v) => !v)}
              style={styles.consentDotHit}>
              <View style={[styles.consentDot, privacyAccepted && styles.consentDotOn]} />
            </Pressable>
            <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}>
              <Text onPress={() => !busy && setPrivacyAccepted((v) => !v)}>
                Я соглашаюсь с{" "}
              </Text>
              <Text style={styles.consentLink} onPress={() => !busy && openPrivacy()}>
                политикой конфиденциальности
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
              label="Зарегистрироваться"
              loading={submitting}
              disabled={oauthBusy != null}
              onPress={onSubmit}
              style={styles.primaryBtn}
            />
            <OutlinePillButton
              label="Продолжить с Google"
              loading={oauthBusy === "google"}
              disabled={submitting || (oauthBusy != null && oauthBusy !== "google")}
              onPress={() => void onOAuth("google")}
            />
            <OutlinePillButton
              label="Продолжить с Apple"
              loading={oauthBusy === "apple"}
              disabled={submitting || (oauthBusy != null && oauthBusy !== "apple")}
              onPress={() => void onOAuth("apple")}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerMuted, { fontFamily: "Inter_400Regular" }]}>
              Есть аккаунт?{" "}
            </Text>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="link" disabled={busy} hitSlop={8}>
                <Text style={[styles.footerLink, { fontFamily: "Inter_400Regular" }]}>
                  Войти
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 28,
    alignSelf: "center",
    maxWidth: 338,
    width: "100%",
    paddingRight: 8,
  },
  consentDotHit: {
    paddingTop: 2,
    paddingRight: 4,
    paddingBottom: 4,
  },
  consentDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: ReadupColors.elevated,
  },
  consentDotOn: {
    backgroundColor: ReadupColors.brand,
  },
  consentText: {
    flex: 1,
    flexWrap: "wrap",
    fontSize: 12,
    color: ReadupColors.textSecondary,
    letterSpacing: -0.48,
    lineHeight: 16,
  },
  consentLink: {
    color: ReadupColors.info,
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
    fontSize: 12,
    color: ReadupColors.text,
    letterSpacing: -0.48,
  },
  footerLink: {
    fontSize: 12,
    color: ReadupColors.brand,
    letterSpacing: -0.48,
  },
});
