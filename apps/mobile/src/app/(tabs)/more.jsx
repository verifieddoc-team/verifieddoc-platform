import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Activity,
  ChevronRight,
  CircleHelp,
  LogOut,
  ScanLine,
  Shield,
  UserRound,
} from "lucide-react-native";
import { Screen } from "../../components/screen";
import { Brand, SectionHeading } from "../../components/ui";
import { useSession } from "../../context/session-context";
import { colors, radius, shadow, spacing } from "../../theme";

export default function MoreScreen() {
  const router = useRouter();
  const { session, isDemo, signOut } = useSession();

  async function exit() {
    await signOut();
    router.replace("/");
  }

  return (
    <Screen>
      <Brand compact />
      <SectionHeading
        copy="Account details, verification tools, and product information."
        eyebrow={isDemo ? "Fictional demonstration" : "Account"}
        title="More"
      />
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {session?.user.firstName?.[0]}
            {session?.user.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>
            {session?.user.firstName} {session?.user.lastName}
          </Text>
          <Text style={styles.profileEmail}>{session?.user.email}</Text>
        </View>
        <Shield color={colors.success} size={20} />
      </View>
      <View style={styles.menu}>
        <MenuItem
          Icon={ScanLine}
          label="Scan or verify a credential"
          onPress={() => router.push("/verify")}
        />
        <MenuItem
          Icon={Activity}
          label="Share-link activity"
          onPress={() => router.push("/activity")}
        />
        <MenuItem
          Icon={UserRound}
          label="Profile information"
          onPress={() => router.push("/profile")}
        />
        <MenuItem
          Icon={CircleHelp}
          label="About and verification guidance"
          onPress={() => router.push("/about")}
        />
      </View>
      <Pressable onPress={exit} style={styles.logout}>
        <LogOut color={colors.error} size={20} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function MenuItem({ Icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuIcon}>
        <Icon color={colors.indigo} size={20} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight color={colors.gray} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    ...shadow,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.indigo,
    borderRadius: 99,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  profileEmail: {
    color: colors.gray,
    fontSize: 12,
  },
  menu: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 62,
    paddingHorizontal: spacing.md,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  menuLabel: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  logout: {
    alignItems: "center",
    borderColor: "#F2C8C8",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
  },
  logoutText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "700",
  },
});
