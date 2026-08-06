export type PlatformRole = "HOLDER" | "VERIFIER" | "PLATFORM_ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type RegistrationAccountType = "HOLDER" | "VERIFIER" | "ORGANIZATION";

export type OrganizationRole =
  | "ORGANIZATION_ADMIN"
  | "ORGANIZATION_ISSUER";

export type OrganizationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type CredentialStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type ShareLinkState = "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
export type InvitationState = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type VerificationResult = "VALID" | "EXPIRED" | "REVOKED";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: PlatformRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRegistrationSummary {
  id: string;
  name: string;
  industry: string | null;
  status: OrganizationStatus;
  membershipRole: "ORGANIZATION_ADMIN";
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  organization?: OrganizationRegistrationSummary;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  registrationNumber: string | null;
  website: string | null;
  contactEmail: string;
  country: string;
  description: string | null;
  /** Additive organization profile field (nullable for older rows). */
  industry?: string | null;
  /** Additive HR contact fields (nullable for older rows). */
  hrContactName?: string | null;
  hrContactEmail?: string | null;
  hrContactPhone?: string | null;
  status: OrganizationStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminOrganization = Organization & {
  reviewedById: string | null;
};

export interface OrganizationMembershipView {
  organization: Organization;
  membershipRole: OrganizationRole;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  registrationNumber?: string;
  website?: string;
  contactEmail: string;
  country: string;
  description?: string;
}

export interface ReviewOrganizationInput {
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

export interface OrganizationMemberProfile {
  user: PublicUser;
  membershipRole: OrganizationRole;
  joinedAt: string;
}

export type SafeClaimValue = string | number | boolean | null;
export type SafeClaims = Record<string, SafeClaimValue>;

export interface CredentialOrganizationSummary {
  id?: string;
  name: string;
  slug: string;
}

export interface SafeCredential {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  credentialType: string;
  referenceNo: string;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  claims: SafeClaims | null;
  organization: CredentialOrganizationSummary;
  holder?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/** Wallet list / holder dashboard recent-credential row (not full SafeCredential). */
export interface HolderCredentialSummary {
  id: string;
  publicId: string;
  title: string;
  credentialType: string;
  claims: SafeClaims | null;
  organization: Pick<CredentialOrganizationSummary, "name" | "slug">;
  issuedAt: string;
  expiresAt: string | null;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
}

export interface HolderDashboardHolder {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Additive convenience field; firstName/lastName remain canonical. */
  fullName?: string;
  role: "HOLDER";
}

export interface HolderDashboardStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  /** Additive: pending verification requests for this holder. */
  pendingVerifications?: number;
  /** Additive: share links created by this holder in the current UTC month. */
  sharedThisMonth?: number;
}

export type HolderActivityType =
  | "CREDENTIAL_ISSUED"
  | "SHARE_LINK_CREATED"
  | "VERIFICATION_EVENT"
  | "VERIFICATION_REQUEST";

export interface HolderActivityItem {
  id: string;
  type: HolderActivityType;
  title: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface HolderDashboardResponse {
  holder: HolderDashboardHolder;
  stats: HolderDashboardStats;
  recentCredentials: HolderCredentialSummary[];
  /** Additive recent activity feed. */
  recentActivity?: HolderActivityItem[];
}

/** @deprecated Prefer PersonalRegistrationInput or OrganizationRegistrationInput */
export interface LegacyRegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "HOLDER" | "VERIFIER";
}

export interface PersonalRegistrationInput {
  accountType: "HOLDER" | "VERIFIER";
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: true;
  role?: "HOLDER" | "VERIFIER";
}

export interface OrganizationHrContactInput {
  fullName?: string;
  email: string;
  phone?: string;
}

export interface OrganizationRegistrationInput {
  accountType: "ORGANIZATION";
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: true;
  companyName: string;
  industry: string;
  country: string;
  hrContact: OrganizationHrContactInput | string;
}

export type RegisterInput =
  | PersonalRegistrationInput
  | OrganizationRegistrationInput
  | LegacyRegisterInput;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface AcceptInvitationInput {
  token: string;
}

export interface IssueCredentialInput {
  holderEmail: string;
  title: string;
  credentialType: string;
  referenceNo: string;
  description?: string;
  issuedAt: string;
  expiresAt?: string;
  claims?: SafeClaims;
}

export interface RevokeCredentialInput {
  reason: string;
}

export interface ShareLinkSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  maxViews: number | null;
  viewCount: number;
  lastViewedAt: string | null;
  disclosedClaims: string[];
  includeHolderName: boolean;
  includeReferenceNo: boolean;
  state: ShareLinkState;
  verificationUrl?: string;
}

export interface CreateShareLinkResponse {
  shareLink: ShareLinkSummary;
  token: string;
  verificationPath: string;
  verificationUrl: string;
}

export interface CreateShareLinkInput {
  expiresInHours: number;
  maxViews?: number;
  disclosedClaims?: string[];
  includeHolderName?: boolean;
  includeReferenceNo?: boolean;
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  state: InvitationState;
  invitationUrl?: string;
}

export interface CreateInvitationInput {
  email: string;
  role: OrganizationRole;
  expiresInHours?: number;
}

export interface CreateInvitationResponse {
  invitation: InvitationSummary;
  token: string;
  invitationPath: string;
  invitationUrl: string;
}

export interface AcceptInvitationResponse {
  organizationId: string;
  membershipRole: OrganizationRole;
}

export interface PublicVerifiedCredential {
  publicId: string;
  title: string;
  credentialType: string;
  effectiveStatus: CredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt?: string;
  organization: {
    name: string;
    slug: string;
  };
  holderName?: string;
  referenceNo?: string;
  claims?: SafeClaims;
}

export interface PublicVerificationResponse {
  result: VerificationResult;
  credential: PublicVerifiedCredential;
}

export interface SafeAuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  actor: PublicUser | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export type HolderActivityResponse = PaginatedResponse<HolderActivityItem>;

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ServiceHealth {
  status: "ok";
  service: string;
  version: string;
}

export interface ServiceReadiness {
  status: "ready";
  service: string;
}

// ---------------------------------------------------------------------------
// Auth — profile & password reset (additive)
// ---------------------------------------------------------------------------

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetRequestResponse {
  requestId: string;
}

export interface PasswordResetVerifyInput {
  requestId: string;
  otp: string;
}

export interface PasswordResetVerifyResponse {
  resetToken: string;
  expiresInSeconds: number;
}

export interface PasswordResetConfirmInput {
  resetToken: string;
  newPassword: string;
}

// ---------------------------------------------------------------------------
// Verification domain enums & summaries
// ---------------------------------------------------------------------------

export type VerificationMethod = "SHARE_TOKEN" | "QR" | "PUBLIC_ID" | "FILE_HASH";

/** Persisted verification event outcome (DB enum). */
export type VerificationOutcome =
  | "VERIFIED"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID"
  | "NOT_FOUND";

/**
 * Authenticated verifier API result mapping.
 * VERIFIED outcome is exposed as VALID for API clarity.
 * Distinct from public VerificationResult (VALID|EXPIRED|REVOKED only).
 */
export type VerifierVerificationResult =
  | "VALID"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID"
  | "NOT_FOUND";

export type VerificationRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface VerificationEventSummary {
  id: string;
  method: VerificationMethod;
  result: VerificationOutcome;
  createdAt: string;
  credentialPublicIdSnapshot?: string | null;
  organization?: { id: string; name: string; slug: string } | null;
  credential?: {
    publicId: string;
    title: string;
    credentialType: string;
    status: CredentialStatus;
    effectiveStatus: CredentialStatus;
  } | null;
}

export interface PublicCredentialSummary {
  publicId: string;
  title: string;
  credentialType: string;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  organization: {
    name: string;
    slug: string;
  };
}

export interface VerifierVerificationResponse {
  result: VerifierVerificationResult;
  credential?: PublicCredentialSummary;
  verification: {
    id: string;
    method: VerificationMethod;
    result: VerificationOutcome;
    createdAt: string;
  };
}

export type CreateVerificationInput =
  | { method: "SHARE_TOKEN"; token: string }
  | { method: "QR"; token: string }
  | { method: "PUBLIC_ID"; publicId: string };

export interface FileVerificationUploadUrlInput {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileVerificationUploadUrlResponse {
  uploadId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
  headers: { "Content-Type": string };
}

// ---------------------------------------------------------------------------
// Verification requests
// ---------------------------------------------------------------------------

export interface VerificationRequestPersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface VerificationRequestCredentialSummary {
  id: string;
  publicId: string;
  title: string;
  credentialType: string;
  status: CredentialStatus;
  effectiveStatus?: CredentialStatus;
}

export interface VerificationRequestSummary {
  id: string;
  status: VerificationRequestStatus;
  requesterNote: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  credential: VerificationRequestCredentialSummary;
  organization: { id: string; name: string; slug: string };
  holder?: VerificationRequestPersonSummary;
  requestedBy: VerificationRequestPersonSummary;
  reviewedBy?: VerificationRequestPersonSummary | null;
}

export interface CreateVerificationRequestInput {
  /** Canonical PRD field. */
  credentialPublicId?: string;
  /** @deprecated Prefer credentialPublicId. */
  credentialId?: string;
  note?: string;
  /** @deprecated Prefer note. */
  requesterNote?: string;
}

export interface ReviewVerificationRequestInput {
  decision: "APPROVE" | "REJECT";
  note?: string;
}

export interface VerificationRequestResponse {
  request: VerificationRequestSummary;
}

export type VerificationRequestListResponse = PaginatedResponse<VerificationRequestSummary>;

// ---------------------------------------------------------------------------
// Holder personal documents
// ---------------------------------------------------------------------------

export interface PersonalDocument {
  id: string;
  title: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string | null;
  createdAt: string;
}

export interface PersonalDocumentUploadUrlInput {
  title: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PersonalDocumentUploadUrlResponse {
  documentId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
  headers: { "Content-Type": string };
}

export interface PersonalDocumentListResponse {
  data: PersonalDocument[];
}

export interface PersonalDocumentResponse {
  document: PersonalDocument;
}

// ---------------------------------------------------------------------------
// Verifier dashboard & saved organizations
// ---------------------------------------------------------------------------

export interface VerifierDashboardResponse {
  stats: {
    totalVerifications: number;
    successful: number;
    failed: number;
    thisMonth: number;
  };
  recentVerifications: VerificationEventSummary[];
  savedOrganizationsCount: number;
}

export interface SavedOrganizationSummary {
  id: string;
  organizationId: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    country: string;
    status: OrganizationStatus;
    website: string | null;
  };
}

export interface SaveOrganizationInput {
  organizationId: string;
}

export interface SavedOrganizationListResponse {
  data: SavedOrganizationSummary[];
}

export interface SavedOrganizationResponse {
  savedOrganization: SavedOrganizationSummary;
}

// ---------------------------------------------------------------------------
// Organization dashboard & profile patch
// ---------------------------------------------------------------------------

export interface OrganizationDashboardStats {
  totalIssued: number;
  active: number;
  expired: number;
  revoked: number;
  activeRecipients: number;
  pendingVerificationRequests: number;
  issuedThisMonth: number;
}

export interface OrganizationDashboardVerificationRequest {
  id: string;
  status: VerificationRequestStatus;
  requesterNote: string | null;
  createdAt: string;
  credential: {
    id: string;
    publicId: string;
    title: string;
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface OrganizationDashboardResponse {
  stats: OrganizationDashboardStats;
  recentCredentials: SafeCredential[];
  recentVerificationRequests: OrganizationDashboardVerificationRequest[];
}

export interface UpdateOrganizationInput {
  name?: string;
  registrationNumber?: string | null;
  website?: string | null;
  contactEmail?: string;
  country?: string;
  description?: string | null;
  industry?: string | null;
  hrContactName?: string | null;
  hrContactEmail?: string | null;
  hrContactPhone?: string | null;
}

// ---------------------------------------------------------------------------
// Organization recipients & invitations
// ---------------------------------------------------------------------------

export interface OrganizationRecipient {
  id: string;
  user: PublicUser;
  createdAt: string;
}

export interface OrganizationRecipientListResponse {
  data: OrganizationRecipient[];
}

export interface RecipientInvitationSummary {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  state: InvitationState;
}

export interface CreateRecipientInvitationInput {
  email: string;
  expiresInHours?: number;
}

export interface CreateRecipientInvitationResponse {
  invitation: RecipientInvitationSummary;
  token: string;
  invitationPath: string;
  invitationUrl: string;
}

export interface AcceptRecipientInvitationInput {
  token: string;
}

export interface AcceptRecipientInvitationResponse {
  organizationId: string;
  recipientId: string;
}

export interface RecipientInvitationListResponse {
  data: RecipientInvitationSummary[];
}

// ---------------------------------------------------------------------------
// Organization registration documents
// ---------------------------------------------------------------------------

export type OrganizationDocumentType =
  | "REGISTRATION_CERTIFICATE"
  | "TAX_DOCUMENT"
  | "ACCREDITATION"
  | "OTHER";

export type DocumentUploadStatus =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export interface OrganizationDocument {
  id: string;
  documentType: OrganizationDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentUploadStatus;
  uploadedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  downloadUrl?: string;
  downloadUrlExpiresAt?: string;
}

export interface OrganizationDocumentUploadUrlInput {
  documentType: OrganizationDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface OrganizationDocumentUploadUrlResponse {
  documentId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
  headers: { "Content-Type": string };
}

export interface OrganizationDocumentListResponse {
  data: OrganizationDocument[];
}

export interface OrganizationDocumentResponse {
  document: OrganizationDocument;
}

export interface ReviewRegistrationDocumentInput {
  decision: "VERIFY" | "REJECT";
  rejectionReason?: string;
}

// ---------------------------------------------------------------------------
// Credential artifacts
// ---------------------------------------------------------------------------

export interface CredentialArtifact {
  id: string;
  credentialId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  completedAt: string | null;
  createdAt: string;
  downloadUrl?: string;
  downloadUrlExpiresAt?: string;
}

export interface CredentialArtifactUploadUrlInput {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CredentialArtifactUploadUrlResponse {
  artifactId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
  headers: { "Content-Type": string };
}

export interface CredentialArtifactListResponse {
  data: CredentialArtifact[];
}

export interface CredentialArtifactResponse {
  artifact: CredentialArtifact;
}

// ---------------------------------------------------------------------------
// Platform admin
// ---------------------------------------------------------------------------

export interface AdminUser extends PublicUser {
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export type AdminUserStatusInput =
  | { action: "SUSPEND"; reason: string }
  | { action: "REINSTATE" };

export interface AdminDashboardResponse {
  stats: {
    totalUsers: number;
    institutions: number;
    /**
     * Issued credentials count (platform-wide credential inventory).
     * Named `documents` to match admin dashboard product copy.
     */
    documents: number;
    verifications: number;
    growth: {
      usersMoMPercent: number | null;
      institutionsMoMPercent: number | null;
      documentsMoMPercent: number | null;
      verificationsMoMPercent: number | null;
    };
    currentPeriod: {
      from: string;
      to: string;
      users: number;
      institutions: number;
      documents: number;
      verifications: number;
    };
    previousPeriod: {
      from: string;
      to: string;
      users: number;
      institutions: number;
      documents: number;
      verifications: number;
    };
  };
  recentVerificationRequests: Array<{
    id: string;
    status: VerificationRequestStatus;
    createdAt: string;
    credentialId: string;
    organizationId: string;
    holderId: string;
    requestedById: string;
    credential: { publicId: string; title: string };
    organization: { id: string; name: string; slug: string };
  }>;
  fraudAlerts: FraudAlert[];
}

export type AdminUserListResponse = PaginatedResponse<AdminUser>;

// ---------------------------------------------------------------------------
// Fraud alerts
// ---------------------------------------------------------------------------

export type FraudAlertType =
  | "HIGH_RISK_DOCUMENT"
  | "MULTIPLE_VERIFICATION_FAILURES"
  | "REVOKED_CREDENTIAL_ACCESS"
  | "FILE_HASH_MISMATCH"
  | "SUSPICIOUS_ACTIVITY";

export type FraudAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FraudAlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

export interface FraudAlert {
  id: string;
  type: FraudAlertType;
  severity: FraudAlertSeverity;
  status: FraudAlertStatus;
  title: string;
  description: string;
  credentialId: string | null;
  verificationEventId: string | null;
  actorId: string | null;
  ipAddress: string | null;
  occurrenceCount: number;
  metadata: Record<string, unknown> | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FraudAlertStatusInput {
  status: "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
}

export type FraudAlertListResponse = PaginatedResponse<FraudAlert>;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "CREDENTIAL_ISSUED"
  | "CREDENTIAL_REVOKED"
  | "ORGANIZATION_APPROVED"
  | "ORGANIZATION_REJECTED"
  | "ORGANIZATION_INVITATION"
  | "RECIPIENT_INVITATION"
  | "VERIFICATION_REQUEST_SUBMITTED"
  | "VERIFICATION_REQUEST_REVIEWED"
  | "FRAUD_ALERT"
  | "SHARE_LINK_USED"
  | "GENERIC";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
}

export interface NotificationResponse {
  notification: Notification;
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportQuery {
  from: string;
  to: string;
}

export interface ReportExportQuery extends ReportQuery {
  format?: "csv";
}

export interface ReportSummary {
  from: string;
  to: string;
  summary: {
    usersCreated: number;
    institutionsCreated: number;
    /** Issued credentials created in range. */
    documentsIssued: number;
    verifications: number;
    fraudAlertsOpened: number;
    verificationRequests: number;
    verificationByResult: Record<string, number>;
    verificationByMethod: Record<string, number>;
  };
}

export interface DeletedResponse {
  deleted: true;
}
