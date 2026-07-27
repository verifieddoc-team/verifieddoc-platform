import { StyleSheet, Text, View } from "react-native";
import {
  Building2,
  CheckCircle2,
  LockKeyhole,
  SearchCheck,
  UserRoundCheck,
} from "lucide-react-native";
import { Screen } from "../components/screen";
import { Brand, SectionHeading } from "../components/ui";
import { colors, radius, spacing } from "../theme";

export default function AboutScreen() {
  return (
    <Screen>
      <Brand compact />
      <SectionHeading
        copy="A centralized platform for employer and organization credential verification."
        eyebrow="Product purpose"
        title="Trust the issuer-backed record"
      />
      <View style={styles.card}>
        <FlowItem
          Icon={Building2}
          copy="A platform administrator approves the issuing organization."
          number="01"
          title="Organization approval"
        />
        <FlowItem
          Icon={UserRoundCheck}
          copy="An authorized organization member issues a structured credential."
          number="02"
          title="Secure issuance"
        />
        <FlowItem
          Icon={LockKeyhole}
          copy="The holder selects fields and creates a limited link or QR code."
          number="03"
          title="Holder consent"
        />
        <FlowItem
          Icon={SearchCheck}
          copy="A verifier checks the live status and makes an independent decision."
          number="04"
          title="Source confirmation"
        />
      </View>
      <View style={styles.definition}>
        <CheckCircle2 color={colors.success} size={24} />
        <View style={styles.definitionCopy}>
          <Text style={styles.definitionTitle}>What VerifiedDoc confirms</Text>
          <Text style={styles.definitionText}>
            The displayed credential matches a current record created by the
            approved issuing organization.
          </Text>
        </View>
      </View>
      <View style={styles.boundary}>
        <Text style={styles.boundaryTitle}>What VerifiedDoc does not do</Text>
        <Text style={styles.boundaryText}>
          It does not scan arbitrary documents with OCR, issue qualifications
          on behalf of institutions, or make hiring and admission decisions.
        </Text>
      </View>
    </Screen>
  );
}

function FlowItem({ Icon, number, title, copy }) {
  return (
    <View style={styles.flow}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.flowIcon}>
        <Icon color={colors.indigo} size={20} />
      </View>
      <View style={styles.flowCopy}>
        <Text style={styles.flowTitle}>{title}</Text>
        <Text style={styles.flowText}>{copy}</Text>
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
  flow: {
    alignItems: "flex-start",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  number: {
    paddingTop: 10,
    width: 28,
  },
  numberText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
  },
  flowIcon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  flowCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  flowTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  flowText: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
  },
  definition: {
    alignItems: "flex-start",
    backgroundColor: colors.paleSuccess,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  definitionCopy: {
    flex: 1,
  },
  definitionTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "800",
  },
  definitionText: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  boundary: {
    backgroundColor: colors.paleWarning,
    borderRadius: radius.md,
    gap: 4,
    padding: spacing.md,
  },
  boundaryTitle: {
    color: "#765600",
    fontSize: 14,
    fontWeight: "800",
  },
  boundaryText: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
  },
});
