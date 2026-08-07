import { mobileApi } from "./api";
import { readSession } from "./session";

export async function fetchOrganisationDashboard() {
  const session = await readSession();

  if (!session?.accessToken) {
    throw new Error("Your session has expired. Please log in again.");
  }

  // Get every organisation the authenticated user belongs to.
  const membershipResponse = await mobileApi.organizations(
    session.accessToken
  );

  const memberships = Array.isArray(
    membershipResponse?.organizations
  )
    ? membershipResponse.organizations
    : [];

  if (memberships.length === 0) {
    return {
      organisation: null,
      statistics: {
        documentsIssued: {
          value: 0,
          trendDirection: null,
          trendValue: null,
        },
        verificationRequests: null,
        pendingRequests: null,
        revokedDocuments: null,
      },
      recentRequests: [],
    };
  }

  // For now the mobile organisation portal uses the first
  // organisation returned for the signed-in user.
  const membership = memberships[0];

  const organizationId =
    membership?.organization?.id;

  if (!organizationId) {
    throw new Error(
      "The organisation record is missing its ID."
    );
  }

  // Fetch the complete membership-aware organisation record
  // plus the organisation's issued credentials.
  const [
    organizationResponse,
    credentialResponse,
  ] = await Promise.all([
    mobileApi.organization(
      session.accessToken,
      organizationId
    ),
    mobileApi.organizationCredentials(
      session.accessToken,
      organizationId
    ),
  ]);

  const organization =
    organizationResponse?.organization ??
    membership.organization;

  const credentials = Array.isArray(
    credentialResponse?.data
  )
    ? credentialResponse.data
    : [];

  const totalIssued =
    credentialResponse?.pagination?.total ??
    credentials.length;

  return {
    organisation: {
      id: organization.id,
      name: organization.name,
      verificationStatus: organization.status,
      membershipRole:
        organizationResponse?.membershipRole ??
        membership?.membershipRole ??
        null,
    },

    statistics: {
      documentsIssued: {
        value: totalIssued,
        trendDirection: null,
        trendValue: null,
      },

      // The backend does not yet expose these
      // organisation dashboard metrics.
      verificationRequests: null,
      pendingRequests: null,
      revokedDocuments: null,
    },

    // Verification-request history is not yet
    // exposed by the current backend.
    recentRequests: [],
  };
}
