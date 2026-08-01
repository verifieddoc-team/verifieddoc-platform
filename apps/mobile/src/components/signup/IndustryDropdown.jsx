import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

const INDUSTRIES = [
  "HR & Recruitment",
  "Banking & FinTech",
  "Education",
  "Government / GovTech",
  "Legal Services",
  "Real Estate / PropTech",
  "Insurance",
  "Transportation",
  "Professional Licensing",
  "Background Screening",
];

export default function IndustryDropdown({ value, onSelect, error }) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>Industry</Text>
      <Pressable
        style={[styles.inputWrapper, error && { borderColor: COLORS.error }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons
          name="office-building"
          size={20}
          color={COLORS.secondary}
          style={styles.inputIcon}
        />
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value || "Select Industry"}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={22} color={COLORS.textSecondary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Industry</Text>
            <FlatList
              data={INDUSTRIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.rowText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.text, marginBottom: 8 },
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
  valueText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.text },
  placeholderText: { color: COLORS.textSecondary },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.error, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "60%", padding: 20 },
  sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: COLORS.primary, marginBottom: 12 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceTint },
  rowText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.text },
});