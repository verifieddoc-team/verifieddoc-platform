import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  iconName,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
}) {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          error && { borderColor: COLORS.error },
        ]}
      >
        {iconName && (
          <MaterialIcons
            name={iconName}
            size={20}
            color={COLORS.secondary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={styles.input}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((prev) => !prev)} hitSlop={8}>
            <MaterialIcons
              name={hidden ? "visibility-off" : "visibility"}
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: SPACING_MD },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: COLORS.surface,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    height: "100%",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
});

const SPACING_MD = 16;