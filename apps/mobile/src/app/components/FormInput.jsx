import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";


export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
  rightIcon,
  style,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  editable = true,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isPassword = secureTextEntry;
  const hideText = isPassword && !isVisible;

  const borderColor = error
    ? "#E53935"
    : isFocused
    ? "#1F3864"
    : "#D1D9E6";

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, { borderColor }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0BAC9"
          secureTextEntry={hideText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          autoCorrect={false}
        />

        {/* Eye toggle for password fields */}
        {isPassword && (
          <Pressable
            onPress={() => setIsVisible((v) => !v)}
            style={styles.eyeButton}
            accessibilityLabel={isVisible ? "Hide password" : "Show password"}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isVisible ? (
              // Eye open
              <View style={styles.eyeIcon}>
                <View style={styles.eyeOuter} />
                <View style={styles.eyeInner} />
              </View>
            ) : (
              // Eye with slash
              <View style={styles.eyeIcon}>
                <View style={styles.eyeOuter} />
                <View style={styles.eyeInner} />
                <View style={styles.eyeSlash} />
              </View>
            )}
          </Pressable>
        )}

        {/* Custom right icon */}
        {rightIcon && !isPassword ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F3864",
    marginBottom: 8,
    fontFamily: "Poppins_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: "#F8FAFF",
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1F3864",
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  eyeIcon: {
    width: 22,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeOuter: {
    width: 20,
    height: 13,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: "#7A8DB0",
  },
  eyeInner: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7A8DB0",
  },
  eyeSlash: {
    position: "absolute",
    width: 22,
    height: 1.8,
    backgroundColor: "#7A8DB0",
    transform: [{ rotate: "45deg" }],
  },
  rightIconWrapper: {
    marginLeft: 8,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: "#E53935",
    fontFamily: "Poppins_400Regular",
  },
});
