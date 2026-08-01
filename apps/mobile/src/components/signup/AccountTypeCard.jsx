import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

export default function AccountTypeCard({ role, isSelected, onContinue, cardWidth }) {
  const { IconComponent, iconName, title, bullets } = role;

  return (
    <View style={[styles.card, { width: cardWidth }, isSelected && styles.cardSelected]}>
      <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
        <IconComponent name={iconName} size={32} color={COLORS.secondary} />
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.bulletList}>
        {bullets.map((line) => (
          <Text key={line} style={styles.bulletText}>
            {line}
          </Text>
        ))}
      </View>

      <Pressable
        style={[styles.continueButton, isSelected && styles.continueButtonSelected]}
        onPress={onContinue}
      >
        <Text style={[styles.continueText, isSelected && styles.continueTextSelected]}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  cardSelected: { borderColor: COLORS.primary },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconCircleSelected: { borderColor: COLORS.iconTeal },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
    color: COLORS.primary,
    marginBottom: 10,
  },
  bulletList: { alignSelf: "stretch", marginBottom: 18 },
  bulletText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  continueButton: {
    alignSelf: "stretch",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueButtonSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  continueText: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.text },
  continueTextSelected: { color: COLORS.surface },
});