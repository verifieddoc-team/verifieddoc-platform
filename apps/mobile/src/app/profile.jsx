import { StyleSheet, Text, View } from "react-native";
import { AtSign, CalendarDays, Shield, UserRound } from "lucide-react-native";
import { Screen } from "../components/screen";
import { SectionHeading } from "../components/ui";
import { useSession } from "../context/session-context";
import { formatDate, humanize } from "../lib/format";
import { colors, radius, spacing } from "../theme";

export default function ProfileScreen() {
  const { session, isDemo } = useSession();
  const user = session?.user;

  return (
    <Screen>
      <SectionHeading
        copy="Basic identity fields attached to this VerifiedDoc account."
        eyebrow={isDemo ? "Fictional profile" : "Account"}
        title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
      />
      <View style={styles.card}>
        <ProfileRow
          Icon={UserRound}
          label="Full name"
          value={`${user?.firstName} ${user?.lastName}`}
        />
        <ProfileRow Icon={AtSign} label="Email address" value={user?.email} />
        <ProfileRow
          Icon={Shield}
          label="Platform role"
          value={humanize(user?.role ?? "HOLDER")}
        />
        <ProfileRow
          Icon={CalendarDays}
          label="Account created"
          value={formatDate(user?.createdAt)}
        />
      </View>
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Profile editing is outside this MVP</Text>
        <Text style={styles.noteCopy}>
          The current release shows account identity and protects credential
          sharing separately. Profile update and password recovery remain
          planned enhancements.
        </Text>
      </View>
    </Screen>
  );
}

function ProfileRow({ Icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Icon color={colors.indigo} size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: colors.gray,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  note: {
    backgroundColor: colors.paleWarning,
    borderRadius: radius.md,
    gap: 4,
    padding: spacing.md,
  },
  noteTitle: {
    color: "#765600",
    fontSize: 13,
    fontWeight: "800",
  },
  noteCopy: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
  },
});
