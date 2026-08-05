import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";

import { ReadupRadii, useReadupColors } from "@/shared/constants/readup-theme";

const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  onComplete?: (value: string) => void;
};

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  accessibilityLabel = "Verification code",
  onComplete,
}: OtpInputProps) {
  const colors = useReadupColors();
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cells = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const timer = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [autoFocus, disabled]);

  function emitChange(next: string) {
    const normalized = digitsOnly(next);
    onChange(normalized);
    if (normalized.length === OTP_LENGTH) {
      onComplete?.(normalized);
    }
  }

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    setFocusedIndex(clamped);
    inputsRef.current[clamped]?.focus();
  }

  function handleChangeAt(index: number, text: string) {
    if (disabled) return;

    const cleaned = digitsOnly(text);

    // Paste of full / partial code into any box
    if (cleaned.length > 1) {
      emitChange(cleaned);
      focusIndex(Math.min(cleaned.length, OTP_LENGTH - 1));
      return;
    }

    const nextCells = [...cells];
    if (cleaned.length === 0) {
      nextCells[index] = "";
      emitChange(nextCells.join(""));
      return;
    }

    nextCells[index] = cleaned;
    emitChange(nextCells.join(""));
    if (index < OTP_LENGTH - 1) {
      focusIndex(index + 1);
    }
  }

  function handleKeyPressAt(
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (disabled) return;
    if (event.nativeEvent.key !== "Backspace") return;

    if (cells[index]) {
      const nextCells = [...cells];
      nextCells[index] = "";
      emitChange(nextCells.join(""));
      return;
    }

    if (index > 0) {
      const nextCells = [...cells];
      nextCells[index - 1] = "";
      emitChange(nextCells.join(""));
      focusIndex(index - 1);
    }
  }

  return (
    <View
      style={styles.row}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}>
      {cells.map((digit, index) => {
        const focused = focusedIndex === index;
        return (
          <Pressable
            key={index}
            disabled={disabled}
            onPress={() => focusIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabel}, digit ${index + 1} of ${OTP_LENGTH}`}
            style={[
              styles.cell,
              {
                backgroundColor: colors.surface,
                borderColor: focused ? colors.info : colors.elevated,
                borderWidth: focused ? 2 : 1,
                opacity: disabled ? 0.55 : 1,
              },
            ]}>
            <TextInput
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digit}
              onChangeText={(text) => handleChangeAt(index, text)}
              onKeyPress={(e) => handleKeyPressAt(index, e)}
              onFocus={() => setFocusedIndex(index)}
              editable={!disabled}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
              importantForAutofill="yes"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              caretHidden={Platform.OS === "ios"}
              style={[styles.input, { color: colors.text }]}
              accessibilityLabel={`${accessibilityLabel} ${index + 1}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    maxWidth: 338,
    alignSelf: "center",
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 48,
    borderRadius: ReadupRadii.input,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    padding: 0,
  },
});
