import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

export default function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: "Choose Account type" },
    { number: 2, label: "Create Account" },
  ];

  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isDone = currentStep > step.number;
        const isFilled = isActive || isDone;

        return (
          <React.Fragment key={step.number}>
            <View style={styles.stepItem}>
              <View style={[styles.circle, isFilled && styles.circleActive]}>
                <Text style={[styles.circleText, isFilled && styles.circleTextActive]}>
                  {step.number}
                </Text>
              </View>
              <Text style={[styles.label, isFilled && styles.labelActive]}>
                {step.label}
              </Text>
            </View>
            {index === 0 && <View style={styles.connector} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepItem: { alignItems: "center", marginHorizontal: 8 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  circleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  circleText: { fontSize: 12, fontFamily: "Inter_500Medium", color: COLORS.textSecondary },
  circleTextActive: { color: COLORS.surface },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  labelActive: { color: COLORS.primary, fontFamily: "Inter_500Medium" },
  connector: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },
});