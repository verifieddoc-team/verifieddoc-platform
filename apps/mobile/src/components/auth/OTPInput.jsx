// src/components/auth/OTPInput.jsx
import React, { useRef, useState, useEffect } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

const CELL_COUNT = 6;

export default function OTPInput({ value, onChange, hasError }) {
  const [digits, setDigits] = useState(Array(CELL_COUNT).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);

  // Keep parent's `value` string in sync with internal digit array
  useEffect(() => {
    onChange(digits.join(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const focusInput = (index) => {
    if (index >= 0 && index < CELL_COUNT) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChangeText = (text, index) => {
    // Handle paste: if more than one character comes in at once,
    // spread it across the remaining boxes.
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, "").slice(0, CELL_COUNT);
      const newDigits = Array(CELL_COUNT).fill("");
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, CELL_COUNT - 1);
      focusInput(nextIndex);
      return;
    }

    // Single digit typed
    const numericText = text.replace(/[^0-9]/g, "");
    const newDigits = [...digits];
    newDigits[index] = numericText;
    setDigits(newDigits);

    if (numericText && index < CELL_COUNT - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      // Move to previous box and clear it
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      focusInput(index - 1);
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => {
        const isActive = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            keyboardType="number-pad"
            maxLength={index === 0 ? CELL_COUNT : 1} // box 0 also accepts a full pasted code
            textContentType="oneTimeCode" // iOS: enables SMS autofill suggestion
            style={[
              styles.cell,
              isActive && styles.cellActive,
              hasError && styles.cellError,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  cellActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  cellError: {
    borderColor: COLORS.error,
  },
});