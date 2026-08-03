import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";


export default function OtpInput({
  value = "",
  onChange,
  length = 6,
  cellSize = 48,
  activeColor = "#1F3864",
  filledColor = "#1F3864",
  inactiveColor = "#D1D9E6",
}) {
  const inputs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  const handleChange = (text, index) => {
    // Only accept digits
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const chars = value.split("");

    if (digit) {
      chars[index] = digit;
      const next = index + 1;
      if (next < length) {
        inputs.current[next]?.focus();
      }
    } else {
      chars[index] = "";
    }

    onChange(chars.join(""));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!value[index] && index > 0) {
        // Move to previous cell
        const chars = value.split("");
        chars[index - 1] = "";
        onChange(chars.join(""));
        inputs.current[index - 1]?.focus();
      } else {
        const chars = value.split("");
        chars[index] = "";
        onChange(chars.join(""));
      }
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const isFocused = focusedIndex === i;
        const isFilled = !!value[i];
        const borderColor = isFocused
          ? activeColor
          : isFilled
          ? filledColor
          : inactiveColor;

        return (
          <Pressable
            key={i}
            onPress={() => inputs.current[i]?.focus()}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                borderColor,
                backgroundColor: isFocused ? "#EDF1FF" : "#F8FAFF",
              },
            ]}
          >
            <TextInput
              ref={(ref) => (inputs.current[i] = ref)}
              style={[
                styles.cellText,
                { color: "#1F3864" },
              ]}
              value={value[i] || ""}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              caretHidden
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
  },
  cell: {
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellText: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    width: "100%",
    height: "100%",
    textAlignVertical: "center",
  },
});
