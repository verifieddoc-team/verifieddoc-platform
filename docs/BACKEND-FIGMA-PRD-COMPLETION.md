# Backend Figma / PRD Completion Matrix

**Branch:** `feat/backend-figma-prd-completion`
**Base:** `develop`
**Status:** COMPLETE — backend modules, shared contracts, OpenAPI, and deployment docs aligned

## Execution checklist

| Order | Module | Status |
| --- | --- | --- |
| A | Urgent registration contract alignment (PHASE 0) | COMPLETE |
| B | Prisma schema foundation and migration SQL | COMPLETE |
| C | Authentication, profile, user status, password reset | COMPLETE |
| D | Verification events and public/authenticated verification | COMPLETE |
| E | Verification requests | COMPLETE |
| F | Holder dashboard, activity, personal documents | COMPLETE |
| G | Verifier dashboard, history, saved orgs, file checks | COMPLETE |
| H | Organization recipients, dashboard, profile, request review | COMPLETE |
| I | Organization documents and credential artifacts | COMPLETE |
| J | Admin dashboard, users, monitoring, fraud, reports | COMPLETE |
| K | Notifications | COMPLETE |
| L | Shared contracts, OpenAPI, catalogs, deployment docs | COMPLETE |
| M | Full regression / security / build / validate | COMPLETE |

## Matrix

| User | Figma action | Existing endpoint | Required endpoint | Model required | Implementation status |
| --- | --- | --- | --- | --- | --- |
| Auth | Register HOLDER/VERIFIER (legacy) | `POST /auth/register` | Extend | User.fullName/phone/terms | COMPLETE |
| Auth | Register with fullName + phone + terms | — | `POST /auth/register` | User | COMPLETE |
| Auth | Register ORGANIZATION account | — | `POST /auth/register` accountType ORGANIZATION | User + Organization + Member | COMPLETE |
| Auth | Login / refresh / logout / me | Existing | Preserve | User.status | COMPLETE |
| Auth | Forgot password / OTP / reset | — | password-reset/* | PasswordResetChallenge | COMPLETE |
| Auth | Profile update | — | `PATCH /auth/me` | User | COMPLETE |
| Auth | Change password | — | `PATCH /auth/me/password` | User + RefreshToken | COMPLETE |
| Holder | Dashboard | `GET /holder/dashboard` | Extend stats + activity | VerificationRequest, ShareLink | COMPLETE |
| Holder | Activity | — | `GET /holder/activity` | derived / VerificationEvent | COMPLETE |
| Holder | Verification requests | — | `GET /holder/verification-requests` | VerificationRequest | COMPLETE |
| Holder | Personal documents | — | holder/documents/* | PersonalDocument | COMPLETE |
| Holder | Credentials / share links | Existing | Preserve | Credential, ShareLink | COMPLETE |
| Verifier | Dashboard | — | `GET /verifier/dashboard` | VerificationEvent | COMPLETE |
| Verifier | Verify token/QR/publicId | `GET /verify/:token` | + `POST /verifier/verifications` | VerificationEvent | COMPLETE |
| Verifier | History | — | `GET /verifier/verifications` | VerificationEvent | COMPLETE |
| Verifier | Saved orgs | — | saved-organizations/* | SavedOrganization | COMPLETE |
| Verifier | Verification requests | — | verifier/verification-requests/* | VerificationRequest | COMPLETE |
| Verifier | File hash verify | — | file-verifications/* | VerificationUpload, CredentialArtifact | COMPLETE |
| Public | Verify share token | `GET /verify/:token` | Record VerificationEvent | VerificationEvent | COMPLETE |
| Org | Apply / members / invitations / credentials | Existing | Preserve + profile fields | Organization.industry/hr* | COMPLETE |
| Org | Dashboard | — | `GET .../dashboard` | aggregates | COMPLETE |
| Org | Profile PATCH | — | `PATCH /organizations/:id` | Organization | COMPLETE |
| Org | Recipients | — | recipients + recipient-invitations | OrganizationRecipient, RecipientInvitation | COMPLETE |
| Org | Verification request review | — | .../verification-requests/* | VerificationRequest | COMPLETE |
| Org | Registration documents | — | registration-documents/* | OrganizationDocument | COMPLETE (Supabase required in prod) |
| Org | Credential artifacts | — | artifacts/* | CredentialArtifact | COMPLETE (Supabase required in prod) |
| Admin | Org review / audit | Existing | Preserve | — | COMPLETE |
| Admin | Dashboard | — | `GET /admin/dashboard` | aggregates | COMPLETE |
| Admin | Users / suspend | — | admin/users/* | User.status | COMPLETE |
| Admin | Verifications / requests monitor | — | admin/verifications* | VerificationEvent, VerificationRequest | COMPLETE |
| Admin | Fraud alerts | — | admin/fraud-alerts/* | FraudAlert | COMPLETE |
| Admin | Reports / CSV export | — | admin/reports/* | aggregates | COMPLETE |
| Admin | Registration document review | — | admin/.../registration-documents | OrganizationDocument | COMPLETE |
| All | Notifications | — | `/notifications` | Notification | COMPLETE |

## Notes

- Storage: Supabase signed uploads abstraction + deterministic test adapter (no Railway filesystem).
- Email: Resend abstraction + test adapter for password reset OTP.
- Dashboard metrics are derived from real tables only.
- Catalog: [`docs/BACKEND-ENDPOINT-CATALOG.md`](./BACKEND-ENDPOINT-CATALOG.md).
- Deployment: [`docs/BACKEND-DEPLOYMENT-REQUIREMENTS.md`](./BACKEND-DEPLOYMENT-REQUIREMENTS.md).
