# Backend Endpoint Catalog

All paths are relative to `/api/v1`. Types refer to `@verifieddoc/contracts` unless noted.

| Dashboard | Method | Path | Role | Request | Response |
| --- | --- | --- | --- | --- | --- |
| System | GET | /health | Public | — | ServiceHealth |
| System | GET | /ready | Public | — | ServiceReadiness |
| Authentication | POST | /auth/register | Public (rate-limited) | RegisterInput | PendingEmailVerificationRegistrationResponse 201 (or AuthSession if verification disabled) |
| Authentication | POST | /auth/email-verification/verify | Public (rate-limited) | VerifyEmailInput | AuthSession |
| Authentication | POST | /auth/email-verification/resend | Public (rate-limited) | ResendEmailVerificationInput | ResendEmailVerificationResponse 202 |
| Metadata | GET | /meta/industries | Public | — | IndustryListResponse |
| Authentication | POST | /auth/login | Public (rate-limited) | LoginInput | AuthSession (403 EMAIL_NOT_VERIFIED if unverified) |
| Authentication | POST | /auth/refresh | Public (rate-limited) | RefreshInput | AuthSession |
| Authentication | POST | /auth/logout | Public | LogoutInput | 204 |
| Authentication | GET | /auth/me | Bearer (any) | — | { user: PublicUser } |
| Authentication | PATCH | /auth/me | Bearer (any) | UpdateProfileInput | { user: PublicUser } |
| Authentication | PATCH | /auth/me/password | Bearer (any) | ChangePasswordInput | 204 |
| Authentication | POST | /auth/password-reset/request | Public (rate-limited) | PasswordResetRequestInput | PasswordResetRequestResponse 202 |
| Authentication | POST | /auth/password-reset/verify | Public (rate-limited) | PasswordResetVerifyInput | PasswordResetVerifyResponse |
| Authentication | POST | /auth/password-reset/confirm | Public (rate-limited) | PasswordResetConfirmInput | 204 |
| Holder Dashboard | GET | /holder/dashboard | Bearer + HOLDER | — | HolderDashboardResponse |
| Holder Dashboard | GET | /holder/activity | Bearer + HOLDER | query: page,limit,type,from,to | HolderActivityResponse |
| Holder Dashboard | GET | /holder/verification-requests | Bearer + HOLDER | query: page,limit | VerificationRequestListResponse |
| Holder Documents | GET | /holder/documents | Bearer + HOLDER | — | PersonalDocumentListResponse |
| Holder Documents | POST | /holder/documents/upload-url | Bearer + HOLDER | PersonalDocumentUploadUrlInput | PersonalDocumentUploadUrlResponse 201 |
| Holder Documents | POST | /holder/documents/:documentId/complete | Bearer + HOLDER | — | PersonalDocumentResponse |
| Holder Documents | DELETE | /holder/documents/:documentId | Bearer + HOLDER | — | DeletedResponse |
| Credentials | GET | /credentials | Bearer (holder wallet) | query: status,page,limit | Paginated HolderCredentialSummary |
| Credentials | GET | /credentials/:credentialId | Bearer (holder or org issuer) | — | { credential: SafeCredential } |
| Credential Artifacts | GET | /credentials/:credentialId/artifacts | Bearer (holder or org issuer) | — | CredentialArtifactListResponse |
| Share Links | POST | /credentials/:credentialId/share-links | Bearer (holder) | CreateShareLinkInput | CreateShareLinkResponse 201 |
| Share Links | GET | /credentials/:credentialId/share-links | Bearer (holder) | — | { data: ShareLinkSummary[] } |
| Share Links | PATCH | /credentials/:credentialId/share-links/:shareLinkId/revoke | Bearer (holder) | — | { shareLink } |
| Verification | GET | /verify/:token | Public (rate-limited) | — | PublicVerificationResponse |
| Verifier | GET | /verifier/dashboard | Bearer + VERIFIER | — | VerifierDashboardResponse |
| Verifier | POST | /verifier/verifications | Bearer + VERIFIER | CreateVerificationInput | VerifierVerificationResponse |
| Verifier | GET | /verifier/verifications | Bearer + VERIFIER | query: result,method,organizationId,from,to,page,limit | Paginated VerificationEventSummary |
| Verifier | GET | /verifier/verifications/:verificationId | Bearer + VERIFIER | — | { verification } |
| Verifier | GET | /verifier/saved-organizations | Bearer + VERIFIER | — | SavedOrganizationListResponse |
| Verifier | POST | /verifier/saved-organizations | Bearer + VERIFIER | SaveOrganizationInput | SavedOrganizationResponse 201 |
| Verifier | DELETE | /verifier/saved-organizations/:organizationId | Bearer + VERIFIER | — | DeletedResponse |
| Verification Requests | POST | /verifier/verification-requests | Bearer + VERIFIER | CreateVerificationRequestInput | VerificationRequestResponse 201 |
| Verification Requests | GET | /verifier/verification-requests | Bearer + VERIFIER | query: status,page,limit | VerificationRequestListResponse |
| Verification Requests | GET | /verifier/verification-requests/:requestId | Bearer + VERIFIER | — | VerificationRequestResponse |
| Verification Requests | PATCH | /verifier/verification-requests/:requestId/cancel | Bearer + VERIFIER | — | VerificationRequestResponse |
| Verifier | POST | /verifier/file-verifications/upload-url | Bearer + VERIFIER | FileVerificationUploadUrlInput | FileVerificationUploadUrlResponse 201 |
| Verifier | POST | /verifier/file-verifications/:uploadId/complete | Bearer + VERIFIER | — | VerifierVerificationResponse |
| Organization Invitations | POST | /invitations/accept | Bearer (any) | AcceptInvitationInput | AcceptInvitationResponse |
| Organization Recipients | POST | /recipient-invitations/accept | Bearer (email match, rate-limited) | AcceptRecipientInvitationInput | AcceptRecipientInvitationResponse |
| Organizations | POST | /organizations | Bearer (any) | CreateOrganizationInput | OrganizationMembershipView 201 |
| Organizations | GET | /organizations | Bearer (any) | — | { organizations: OrganizationMembershipView[] } |
| Organizations | GET | /organizations/:organizationId | Bearer (member) | — | { organization } |
| Organizations | PATCH | /organizations/:organizationId | Bearer + ORGANIZATION_ADMIN | UpdateOrganizationInput | { organization } |
| Organizations | GET | /organizations/:organizationId/dashboard | Bearer + ORG_ADMIN|ORG_ISSUER | — | OrganizationDashboardResponse |
| Organization Recipients | GET | /organizations/:organizationId/recipients | Bearer + ORG_ADMIN|ORG_ISSUER | — | OrganizationRecipientListResponse |
| Organization Recipients | GET | /organizations/:organizationId/recipient-invitations | Bearer + ORG_ADMIN|ORG_ISSUER | — | RecipientInvitationListResponse |
| Organization Recipients | POST | /organizations/:organizationId/recipient-invitations | Bearer + ORG_ADMIN|ORG_ISSUER | CreateRecipientInvitationInput | CreateRecipientInvitationResponse 201 |
| Organization Recipients | PATCH | /organizations/:organizationId/recipient-invitations/:invitationId/revoke | Bearer + ORG_ADMIN|ORG_ISSUER | — | { invitation } |
| Verification Requests | GET | /organizations/:organizationId/verification-requests | Bearer + ORG_ADMIN|ORG_ISSUER | query: status,page,limit | VerificationRequestListResponse |
| Verification Requests | GET | /organizations/:organizationId/verification-requests/:requestId | Bearer + ORG_ADMIN|ORG_ISSUER | — | VerificationRequestResponse |
| Verification Requests | PATCH | /organizations/:organizationId/verification-requests/:requestId/review | Bearer + ORG_ADMIN|ORG_ISSUER | ReviewVerificationRequestInput | VerificationRequestResponse |
| Organization Documents | GET | /organizations/:organizationId/registration-documents | Bearer + ORGANIZATION_ADMIN | — | OrganizationDocumentListResponse |
| Organization Documents | POST | /organizations/:organizationId/registration-documents/upload-url | Bearer + ORGANIZATION_ADMIN | OrganizationDocumentUploadUrlInput | OrganizationDocumentUploadUrlResponse 201 |
| Organization Documents | POST | /organizations/:organizationId/registration-documents/:documentId/complete | Bearer + ORGANIZATION_ADMIN | — | OrganizationDocumentResponse |
| Organization Documents | DELETE | /organizations/:organizationId/registration-documents/:documentId | Bearer + ORGANIZATION_ADMIN | — | DeletedResponse |
| Organizations | GET | /organizations/:organizationId/audit-logs | Bearer + ORGANIZATION_ADMIN | query pagination/filters | Paginated SafeAuditLogEntry |
| Organizations | GET | /organizations/:organizationId/members | Bearer + ORGANIZATION_ADMIN | — | { members } |
| Organizations | PATCH | /organizations/:organizationId/members/:userId | Bearer + ORGANIZATION_ADMIN | { membershipRole } | { member } |
| Organizations | DELETE | /organizations/:organizationId/members/:userId | Bearer + ORGANIZATION_ADMIN | — | 204 |
| Organization Invitations | POST | /organizations/:organizationId/invitations | Bearer + ORGANIZATION_ADMIN | CreateInvitationInput | CreateInvitationResponse 201 |
| Organization Invitations | GET | /organizations/:organizationId/invitations | Bearer + ORGANIZATION_ADMIN | — | { data: InvitationSummary[] } |
| Organization Invitations | PATCH | /organizations/:organizationId/invitations/:invitationId/revoke | Bearer + ORGANIZATION_ADMIN | — | { invitation } |
| Credentials | POST | /organizations/:organizationId/credentials | Bearer + ORG_ADMIN|ORG_ISSUER | IssueCredentialInput | { credential } 201 |
| Credentials | GET | /organizations/:organizationId/credentials | Bearer + ORG_ADMIN|ORG_ISSUER | query: status,holderId,page,limit | Paginated SafeCredential |
| Credentials | PATCH | /organizations/:organizationId/credentials/:credentialId/revoke | Bearer + ORG_ADMIN|ORG_ISSUER | RevokeCredentialInput | { credential } |
| Credential Artifacts | POST | /organizations/:organizationId/credentials/:credentialId/artifacts/upload-url | Bearer + ORG_ADMIN|ORG_ISSUER | CredentialArtifactUploadUrlInput | CredentialArtifactUploadUrlResponse 201 |
| Credential Artifacts | POST | /organizations/:organizationId/credentials/:credentialId/artifacts/:artifactId/complete | Bearer + ORG_ADMIN|ORG_ISSUER | — | CredentialArtifactResponse |
| Notifications | GET | /notifications | Bearer (any) | query: unreadOnly,page,limit | NotificationListResponse |
| Notifications | PATCH | /notifications/read-all | Bearer (any) | — | MarkAllNotificationsReadResponse |
| Notifications | PATCH | /notifications/:notificationId/read | Bearer (any) | — | NotificationResponse |
| Platform Admin | GET | /admin/dashboard | Bearer + PLATFORM_ADMIN | — | AdminDashboardResponse |
| Platform Admin | GET | /admin/users | Bearer + PLATFORM_ADMIN | query: role,status,search,page,limit | AdminUserListResponse |
| Platform Admin | GET | /admin/users/:userId | Bearer + PLATFORM_ADMIN | — | { user: AdminUser } |
| Platform Admin | PATCH | /admin/users/:userId/status | Bearer + PLATFORM_ADMIN | AdminUserStatusInput | { user: AdminUser } |
| Platform Admin | GET | /admin/verifications | Bearer + PLATFORM_ADMIN | query filters + pagination | Paginated VerificationEventSummary |
| Platform Admin | GET | /admin/verification-requests | Bearer + PLATFORM_ADMIN | query filters + pagination | VerificationRequestListResponse |
| Platform Admin | GET | /admin/organizations | Bearer + PLATFORM_ADMIN | query: status,page,limit | Paginated AdminOrganization |
| Platform Admin | PATCH | /admin/organizations/:organizationId/review | Bearer + PLATFORM_ADMIN | ReviewOrganizationInput | { organization: AdminOrganization } |
| Organization Documents | GET | /admin/organizations/:organizationId/registration-documents | Bearer + PLATFORM_ADMIN | — | OrganizationDocumentListResponse |
| Organization Documents | PATCH | /admin/organizations/:organizationId/registration-documents/:documentId/review | Bearer + PLATFORM_ADMIN | ReviewRegistrationDocumentInput | OrganizationDocumentResponse |
| Fraud Alerts | GET | /admin/fraud-alerts | Bearer + PLATFORM_ADMIN | query filters + pagination | FraudAlertListResponse |
| Fraud Alerts | GET | /admin/fraud-alerts/:alertId | Bearer + PLATFORM_ADMIN | — | FraudAlert |
| Fraud Alerts | PATCH | /admin/fraud-alerts/:alertId/status | Bearer + PLATFORM_ADMIN | FraudAlertStatusInput | FraudAlert |
| Reports | GET | /admin/reports/summary | Bearer + PLATFORM_ADMIN | ReportQuery (from,to) | ReportSummary |
| Reports | GET | /admin/reports/export | Bearer + PLATFORM_ADMIN (rate-limited) | ReportExportQuery | text/csv |
| Platform Admin | GET | /admin/audit-logs | Bearer + PLATFORM_ADMIN | query pagination/filters | Paginated SafeAuditLogEntry |

## Notes

- OpenAPI source of truth for HTTP schemas: `apps/api/src/openapi.ts` (served at `/openapi.json` and `/docs`).
- Shared TypeScript types: `packages/contracts/src/index.ts`.
- Admin dashboard `stats.documents` / report `documentsIssued` mean **issued credentials**, not personal uploads.
- Upload flows return signed URLs; clients PUT bytes to storage, then call the matching `.../complete` endpoint.
