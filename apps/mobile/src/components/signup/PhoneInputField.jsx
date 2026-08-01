import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";

const COUNTRIES = [
  { code: "UG", dial: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "GH", dial: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "RW", dial: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "TZ", dial: "+255", flag: "🇹🇿", name: "Tanzania" },
];

export default function PhoneInputField({ label = "Phone Number", value, onChangeText, error }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrapper, error && { borderColor: COLORS.error }]}>
        <Pressable
          style={styles.countryButton}
          onPress={() => setModalVisible(true)}
          hitSlop={8}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dial}>{country.dial}</Text>
          <MaterialIcons name="arrow-drop-down" size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Enter Your Phone Number"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Country</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryRow}
                  onPress={() => {
                    setCountry(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.dial}>{item.dial}</Text>
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
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: COLORS.surface,
  },
  countryButton: { flexDirection: "row", alignItems: "center" },
  flag: { fontSize: 18, marginRight: 6 },
  dial: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.text, marginRight: 2 },
  divider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.text, height: "100%" },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.error, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "60%", padding: 20 },
  sheetTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 16, color: COLORS.primary, marginBottom: 12 },
  countryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceTint },
  countryName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.text, marginLeft: 8 },
});