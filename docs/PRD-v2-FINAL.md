# VerifiedDoc Final Product Requirements Document

## Employer and Organization Credential Verification Platform

**Document version:** 2.0
**Status:** Final implementation-aligned submission
**Prepared for:** VerifiedDoc Capstone Group
**Prepared by:** Product, Engineering, Design, Mobile, QA, and Technical Writing
**Final alignment date:** 26 July 2026
**Repository:** `https://github.com/verifieddoc-team/verifieddoc-platform`
**Design source:** `https://www.figma.com/design/QfOpHB1N0hJNz0g74uEu59/VerifiedDoc---Centralized-Digital-Document-Verification-Platform`

## 1. Executive summary

VerifiedDoc is a centralized platform for employer and organization credential
verification. Approved organizations create structured credential records for
registered holders. Holders keep those records in a secure wallet and decide
which fields to disclose through limited verification links and QR codes.
Employers and other verifiers check the current issuer-backed record before
making their own decision.

VerifiedDoc is not an OCR document scanner, an AI fraud detector, or a
credential-awarding institution. It confirms that a displayed credential
matches a current record created by the approved organization that issued it.

The final capstone MVP includes a REST API, PostgreSQL database, responsive web
application, Expo mobile holder application, shared contracts, automated
quality gates, fictional demo data, deployment configuration, and technical
handoff documentation.

## 2. Problem statement

Employers and other relying organizations often receive certificates or
employment records that are difficult to confirm quickly. Manual calls and
emails are slow. Static files can be altered. Visual inspection alone does not
prove that the issuer still recognizes the credential or that the record has
not expired or been revoked.

The platform addresses four core problems:

1. Issuers need a controlled and auditable way to record credentials.
2. Holders need a portable wallet and control over disclosure.
3. Verifiers need a current source record, not only a static copy.
4. Platform operators need a trust gate before organizations can issue.

## 3. Product vision and value proposition

### Vision

Make credential confirmation fast, privacy-conscious, current, and directly
connected to the issuing organization.

### Value by audience

| Audience | Value |
| --- | --- |
| Credential holder | Keeps issuer-backed credentials in one wallet and shares only approved fields |
| Issuing organization | Issues, revokes, and audits structured records through authorized members |
| Employer or verifier | Confirms current status and disclosed details from the source record |
| Platform administrator | Approves organizations, reviews platform activity, and checks service readiness |

## 4. Product boundary

### What VerifiedDoc does

- Approves or rejects organization applications.
- Separates global platform roles from organization membership roles.
- Allows verified organizations to issue immutable structured credentials.
- Computes current credential state, including effective expiry.
- Allows authorized issuers to revoke active credentials.
- Gives holders a credential wallet.
- Creates holder-controlled share links with optional QR representation.
- Limits links by expiry, view count, and holder revocation.
- Shows public verification results with minimum disclosure.
- Records sensitive actions in sanitized audit logs.
- Provides API liveness and database readiness checks.

### What VerifiedDoc does not do

- It does not inspect arbitrary uploaded files.
- It does not use OCR or AI to decide whether an image is genuine.
- It does not issue qualifications on behalf of schools, employers, or
  professional bodies.
- It does not decide whether a person should be hired, admitted, licensed, or
  promoted.
- It does not integrate with WAEC, NYSC, universities, government systems, or
  other external institutions in the current release.

## 5. Success objectives

1. A verified organization can issue a fictional credential to a registered
   holder without crossing tenant or role boundaries.
2. A holder can view active, expired, and revoked records.
3. A holder can create a limited link and QR code with privacy defaults off.
4. A verifier can confirm a current record and see only disclosed fields.
5. Invalid, expired, revoked, and exhausted links fail generically.
6. Platform and organization administrators can review the audit evidence
   available to their role.
7. The complete workflow can be demonstrated without real personal data.
8. The API, web, mobile, contracts, migrations, and documentation pass the
   repository quality gate.

## 6. Users and authorization model

### Platform roles

| Role | Scope | Main permissions |
| --- | --- | --- |
| `HOLDER` | Personal | Wallet, credential details, share links |
| `VERIFIER` | Public verification plus personal account | Verify holder-approved links |
| `PLATFORM_ADMIN` | Platform-wide | Organization review and platform audit |

### Organization roles

| Role | Scope | Main permissions |
| --- | --- | --- |
| `ORGANIZATION_ADMIN` | One organization | Members, invitations, credentials, organization audit |
| `ORGANIZATION_ISSUER` | One organization | Issue, list, and revoke organization credentials |

Organization roles come from `OrganizationMember.role`. They never change
`User.role`. A platform administrator without organization membership cannot
issue a credential. A holder or verifier can also be an organization
administrator or issuer through a separate membership.

## 7. Final MoSCoW prioritization

### Must have, completed in the MVP

| Feature | Reason |
| --- | --- |
| User registration and login | Secure account access |
| Authentication and role authorization | Protects platform and tenant boundaries |
| Organization application | Starts the issuer trust process |
| Organization approval or rejection | Prevents unapproved issuance |
| Organization member invitations | Delegates trusted organization access |
| Credential issuance | Core issuer function |
| Immutable credential records | Protects record integrity |
| Credential wallet | Core holder function |
| Effective expiration | Shows current validity at read time |
| Credential revocation | Allows issuers to withdraw an invalid or superseded record |
| Consent-based sharing | Gives the holder disclosure control |
| QR generation and scanning | Provides a usable mobile verification channel |
| Public credential verification | Core verifier function |
| Platform administrator workspace | Supports platform trust and oversight |
| Organization workspace | Supports issuer operations |
| Audit logs | Supports accountability |
| Health and readiness | Supports deployment operations |
| Fictional demo mode | Enables safe capstone review |

### Should have, completed or deliberately bounded

| Feature | Final scope |
| --- | --- |
| User profile | Read-only identity view |
| Search and filtering | Wallet search and server-side status filters |
| Verification history | Browser-session history only for verifiers |
| Share activity | Holder view counts and link states |
| Member role updates and removal | Organization admin only, final-admin protected |

### Could have, deferred

- Basic dashboard analytics.
- In-app notification center.
- Organization suspension and reinstatement workflow.
- Credential renewal workflow.
- Persistent verifier history.
- Profile editing.

### Will not have in the current release

- OCR or AI document inspection.
- External institution integrations.
- Automated email delivery.
- Password recovery.
- Downloadable verification reports.
- Advanced analytics and reporting.
- Production bot or CAPTCHA protection.
- Production app-store publication.

## 8. Functional requirements

### FR-01 Account registration

- A user can register as `HOLDER` or `VERIFIER`.
- Email is normalized to lowercase.
- Password policy requires the configured strength rules.
- Duplicate normalized email returns HTTP 409.
- Public registration cannot create a platform administrator.

**Acceptance:** One concurrent duplicate request succeeds, one returns 409,
and neither returns 500.

### FR-02 Authentication and session lifecycle

- Users can log in with email and password.
- Access tokens are short-lived JWTs using HS256, the configured issuer, and
  the configured audience.
- Refresh tokens are opaque, hashed before storage, rotated on use, and
  protected against replay.
- Logout revokes the submitted refresh token.
- Mobile stores its session in Expo Secure Store.
- Web stores its current token response only in tab-scoped session storage.

**Acceptance:** Invalid credentials return a generic response. A reused refresh
token revokes the active token family.

### FR-03 Organization application

- An authenticated user can submit organization name, slug, contact email,
  country, optional registration number, optional website, and description.
- The applicant receives `ORGANIZATION_ADMIN` membership.
- The applicant's global platform role remains unchanged.
- The organization starts in `PENDING`.
- A duplicate normalized slug returns HTTP 409.

**Acceptance:** Organization creation and applicant membership are atomic.

### FR-04 Organization review

- Only `PLATFORM_ADMIN` can list pending applications and approve or reject.
- Rejection requires a reason.
- Only a pending organization can be reviewed.
- The decision and audit entry are created atomically.
- Concurrent review attempts allow exactly one decision.

**Acceptance:** Approved organizations become `VERIFIED`. Rejected
organizations become `REJECTED`.

### FR-05 Organization membership

- Organization admins can create invitations for admin or issuer roles.
- Invitation URLs place the raw token in a URL fragment.
- The client removes the fragment from browser history and submits the token in
  a POST body.
- The invited account email must match.
- Organization admins can change member roles or remove members.
- The final organization administrator cannot be demoted or removed.

**Acceptance:** Raw invitation tokens are returned once and only their hashes
are stored.

### FR-06 Credential issuance

- Only organization admins and issuers can issue.
- The organization must be `VERIFIED`.
- The holder email must belong to an existing user.
- Required fields are title, type, reference number, and issue date.
- Expiry, description, and scalar claims are optional.
- Reference numbers are unique per organization.
- Issuance and its audit entry are atomic.
- Issued credentials are immutable.

**Acceptance:** Corrections use revoke and reissue. No update endpoint changes
an issued credential's content.

### FR-07 Credential wallet and details

- Authenticated holders see only credentials issued to their user ID.
- Wallet responses compute effective `ACTIVE`, `EXPIRED`, or `REVOKED` state.
- Details include public ID, issuer, reference number, dates, type, approved
  claims, and authenticated revocation information.
- Cross-holder and cross-organization access is forbidden.

### FR-08 Credential revocation

- Organization admins and issuers can revoke only their organization's active,
  unexpired credential.
- Revocation requires a private reason.
- Public verification does not reveal the private reason.
- Concurrent revocation attempts allow one success.

### FR-09 Consent-based share links

- Only the credential holder can create or list share links.
- A share link can set expiry hours and an optional view limit.
- Holder name defaults to hidden.
- Reference number defaults to hidden.
- Claims default to hidden and must exist on the credential.
- Raw tokens are generated with sufficient entropy and stored only as hashes.
- The holder can revoke an active link.
- The client can render the one-time verification URL as a QR code.

### FR-10 Public verification

- Anyone with a valid link token can verify without an account.
- View consumption is atomic.
- The response shows `VALID`, `EXPIRED`, or `REVOKED` credential state.
- Only the holder-approved name, reference, and claims are disclosed.
- Invalid, expired, revoked, exhausted, and unknown links return the same
  generic unavailable response.
- Raw verification tokens and authorization values are redacted from logs.

### FR-11 Audit access

- Organization admins can view logs scoped by `organizationId`.
- Platform administrators can view platform-wide logs.
- Logs support action, resource, date, organization, and actor filters where
  applicable.
- Passwords, tokens, hashes, cookies, authorization headers, and request bodies
  are removed from audit responses.

### FR-12 Operational readiness

- `GET /api/v1/health` reports process liveness.
- `GET /api/v1/ready` verifies database readiness and returns 503 without
  leaking internals when unavailable.
- A controlled script bootstraps the first platform administrator.
- A guarded script creates fictional demo data only outside production.

### FR-13 Web application

- The responsive web app provides public, holder, organization, verifier, and
  platform-admin experiences.
- Normal authentication connects to the live API.
- Explicit demo actions use fictional in-browser data.
- Demo mode never hides a failed live request.
- Application routes work through a static-host SPA rewrite.

### FR-14 Mobile application

- The mobile holder app uses React Native, JavaScript and JSX, Expo SDK 57, and
  Expo Router.
- It provides secure sign-in, wallet, detail, consent sharing, QR generation,
  QR scanning, manual verification, share activity, profile, and sign-out.
- Camera permission has a manual-token fallback.
- Privileged organization and platform operations remain in the web app.

## 9. Primary user flows

### Organization trust flow

1. A holder or verifier creates a personal account.
2. The user submits an organization application.
3. The platform administrator reviews and decides.
4. A verified organization can invite additional admins and issuers.

### Credential lifecycle flow

1. An authorized organization member selects an existing holder by email.
2. The issuer creates an immutable structured credential.
3. The holder sees the credential in the wallet.
4. The credential becomes effectively expired when its expiry passes.
5. An authorized issuer can revoke an active record with a private reason.
6. A correction creates a replacement credential instead of editing the old
   record.

### Sharing and verification flow

1. The holder selects an active credential.
2. The holder chooses link duration, view limit, identity fields, and claims.
3. VerifiedDoc returns the raw URL once.
4. The client shows the URL and QR code.
5. The verifier opens the link, enters the token, or scans the QR code.
6. VerifiedDoc atomically consumes a view and returns the current record with
   only approved fields.

## 10. UX and Figma alignment

### Design tokens

| Token | Value | Use |
| --- | --- | --- |
| Deep Indigo | `#1F3864` | Primary brand, navigation, primary actions |
| Slate Teal | `#2C6E7F` | Secondary actions, links, information |
| Warm Gold | `#B08D57` | Trust accent and selected emphasis |
| Success | `#2E7D32` | Valid, verified, active |
| Warning | `#F9A825` | Pending and expired |
| Error | `#C62828` | Revoked, rejected, destructive action |
| Ink | `#1A1D23` | Primary text |
| Gray | `#6B6F76` | Secondary text |
| Divider | `#E0E0E0` | Borders and separation |
| Surface | `#F7F2FA` | Application background |

### Typography

- Poppins Semibold for primary headings.
- Poppins Medium for section headings.
- Inter for body copy, labels, tables, and controls.

### Screen alignment decisions

| Figma concept | Final implementation |
| --- | --- |
| Desktop holder dashboard | Live wallet, status metrics, credential detail, sharing |
| Desktop organization dashboard | Live credentials, issue form, members, invitations, audit |
| Desktop verifier dashboard | Token verification, session history, result guidance |
| Mobile home | Wallet summary, verify action, share action |
| Mobile credential detail | Public ID and reference number, not DID |
| Mobile share | Copy URL, native share, and QR, not PDF export |
| Mobile More | Activity, profile, about, and sign-out |
| Forgot password and OTP frames | Future scope, not linked in the MVP |
| Organization signup frame | Personal registration followed by organization application |

## 11. Architecture and technology

| Layer | Technology | Responsibility |
| --- | --- | --- |
| API | Node.js, Express 5, TypeScript | HTTP routes, validation, authorization, business rules |
| Database | PostgreSQL, Prisma | Relational data, migrations, transactions, constraints |
| Web | React 19, TypeScript, Vite | Responsive public and role workspaces |
| Mobile | React Native, JSX, Expo SDK 57, Expo Router | Holder wallet, sharing, camera verification |
| Contracts | TypeScript package | Safe cross-client request and response shapes |
| Testing | Vitest, Jest, Supertest | Unit, integration, concurrency, and client tests |
| CI | GitHub Actions | PostgreSQL service, migrations, quality gate |
| Deployment | Render Blueprint, Supabase PostgreSQL | API, static web, and hosted database |

### Repository ownership

| Path | Primary owner |
| --- | --- |
| `apps/api` | Backend |
| `apps/web` | Frontend and UI/UX |
| `apps/mobile` | Mobile and UI/UX |
| `packages/contracts` | Backend and client leads |
| `docs` | Product, technical writing, and track leads |
| `.github/workflows` | Engineering lead and QA |
| `render.yaml` | Backend and deployment owner |

## 12. Data model summary

The main entities are:

- `User`
- `RefreshToken`
- `Organization`
- `OrganizationMember`
- `OrganizationInvitation`
- `Credential`
- `ShareLink`
- `AuditLog`

Important constraints include unique user email, unique organization slug,
unique organization membership, unique credential reference within an
organization, one active invitation per organization and email, and unique
hashed tokens.

## 13. Security and privacy requirements

1. Passwords are hashed with bcrypt.
2. JWT algorithm, issuer, audience, and lifetime are explicit.
3. Refresh tokens are opaque, rotated, hashed, and family-revoked after replay.
4. Platform and organization roles are separate.
5. Every organization query is tenant-scoped.
6. Organization review, issuance, revocation, invitation, and member changes
   use transactions or conditional claims.
7. Share and invitation tokens are stored as SHA-256 hashes.
8. Holder name, reference number, and claims are hidden by default.
9. Public revocation reason is hidden.
10. Sensitive request headers and URL tokens are redacted from logs.
11. Audit responses sanitize secrets and request bodies.
12. Production rejects default database URLs, local public URLs, weak JWT
    secrets, wildcard CORS, and malformed CORS origins.
13. Real personal data is not required for development or presentation.
14. Applied migrations are never edited. Schema changes add a new migration.

## 14. Non-functional requirements

### Performance

- Paginated list endpoints limit response size.
- Indexed tenant, status, token, date, and audit fields support primary queries.
- Static web assets use hashed long-lived caching.

### Reliability

- Database-sensitive operations are atomic.
- Concurrent claims return controlled conflicts instead of inconsistent state.
- Health and readiness are separate.

### Accessibility

- Web controls use semantic labels and visible focus states.
- Status is communicated with text, not color alone.
- Responsive layouts support phone, tablet, and desktop widths.
- Mobile verification provides camera and manual input.
- Reduced-motion preferences are respected on the web.

### Maintainability

- Workspaces are separated by product layer.
- Shared contracts prevent client drift.
- OpenAPI documents the backend.
- CI runs lint, type checking, tests, build, Prisma generation, and migrations.

## 15. API groups

- System: `/health`, `/ready`
- Authentication: `/auth/*`
- Organizations: `/organizations/*`
- Platform review: `/admin/organizations/*`
- Members: `/organizations/:organizationId/members/*`
- Invitations: `/organizations/:organizationId/invitations/*`,
  `/invitations/accept`
- Credentials: `/organizations/:organizationId/credentials/*`,
  `/credentials/*`
- Sharing: `/credentials/:credentialId/share-links/*`
- Public verification: `/verify/:token`
- Audit: `/organizations/:organizationId/audit-logs`,
  `/admin/audit-logs`

Swagger UI is served at `/docs`. OpenAPI JSON is served at `/openapi.json`.

## 16. Deployment requirements

### Database

- PostgreSQL is hosted on Supabase.
- `DATABASE_URL` is provided only through environment configuration.
- All nine migrations must be applied before serving traffic.

### API

- Render builds from the repository root.
- Prisma Client is generated before TypeScript build.
- Migrations run in the pre-deploy command.
- Production starts `apps/api/dist/src/server.js`.
- Health check path is `/api/v1/ready`.

### Web

- Render publishes `apps/web/dist` as a static site.
- All application routes rewrite to `/index.html`.
- `VITE_API_BASE_URL` contains the deployed API base ending in `/api/v1`.
- The API `CORS_ORIGINS` and `PUBLIC_WEB_URL` contain the deployed web origin.

### Mobile

- `EXPO_PUBLIC_API_BASE_URL` contains the reachable API URL.
- Device testing requires camera permission.
- App-store signing and production release are outside the capstone scope.

## 17. Testing and acceptance

### Automated quality gate

```bash
npm run validate
git diff --check
```

CI provisions PostgreSQL, applies all migrations, generates Prisma Client, and
runs lint, type checking, automated tests, and production builds.

### Final local verification, 26 July 2026

| Check | Result |
| --- | --- |
| Monorepo lint | Passed |
| API, web, mobile, and contracts type checking | Passed |
| Web automated tests | 4 of 4 passed |
| Mobile automated tests | 3 of 3 passed |
| API production build and start smoke test | Passed, including `/api/v1/health` |
| Web production build | Passed |
| Expo static web export | Passed, 16 routes |
| Expo SDK package compatibility | Passed with `expo install --check` |
| Whitespace validation | Passed |

The latest backend integration suite recorded before the client-only alignment
work passed 156 of 156 tests. The final pull request must rerun that suite in
GitHub Actions because it provisions the required PostgreSQL test service.

### Manual acceptance checklist

- Register and log in as a holder and verifier.
- Submit an organization application.
- Approve it as a platform administrator.
- Invite and accept an organization issuer.
- Issue a credential to an existing fictional holder.
- Confirm the holder wallet receives it.
- Confirm expired and revoked states.
- Create a privacy-default share link.
- Render and scan its QR code.
- Verify only selected fields.
- Revoke the share link and confirm generic unavailability.
- Confirm cross-holder and cross-organization access is blocked.
- Confirm platform admin without membership cannot issue.
- Confirm audit logs contain actions but no secrets.
- Confirm health, readiness, Swagger, web routes, and mobile routes.
- Confirm desktop, tablet, and phone layouts.

## 18. Demonstration data

The guarded demo seed creates only fictional `@example.test` users:

- `demo.platform-admin@example.test`
- `demo.org-admin@example.test`
- `demo.issuer@example.test`
- `demo.holder@example.test`
- `demo.verifier@example.test`

It creates a verified fictional organization and active, expired, and revoked
credentials with references:

- `DEMO-ACTIVE-001`
- `DEMO-EXPIRED-001`
- `DEMO-REVOKED-001`

The offline presentation token is `DEMO-VERIFIED-2026`. It is not a production
credential and must not be confused with a database share token.

## 19. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Free-host cold start | Show readiness check and keep fictional demo available |
| External database latency | Region alignment, connection pooler, pagination |
| Token leakage | One-time display, hashing, URL/log redaction, fragment invitations |
| Tenant data exposure | Membership-scoped queries and cross-tenant tests |
| UI and API drift | Shared contracts, OpenAPI, CI |
| Real-data collection slowing the capstone | Use fictional data until governance and partnerships exist |
| Web refresh token accessible to JavaScript | Tab-scoped storage now, HTTP-only cookie hardening later |
| IP-only rate limiting | Add account-aware controls and bot protection in a later release |
| No automated email delivery | Deliver one-time invitation URLs through a trusted channel |
| Expo and React Native transitive audit advisories | Track upstream SDK fixes, avoid breaking forced downgrades, and keep the dependency gate visible in release reviews |

## 20. Roadmap

### Phase 2

- Password recovery and verified email.
- Profile editing.
- Automated invitation and status email delivery.
- Organization suspension and reinstatement.
- Credential renewal.
- Persistent verifier history.
- Basic analytics.
- HTTP-only cookie session hardening for web.

### Phase 3

- External institution integrations.
- Governed real-organization onboarding evidence.
- Downloadable verification reports.
- Advanced analytics.
- Production bot protection.
- App-store release automation.

### Separate research track

OCR and AI document fraud analysis require separate accuracy, bias, security,
privacy, and liability research. They are not extensions of the issuer-backed
record model by default.

## 21. Presentation statement

VerifiedDoc gives employers a current issuer-backed record, gives holders
control over disclosure, gives organizations an auditable credential lifecycle,
and gives the platform a clear trust gate. The capstone proves the complete
workflow with fictional data while preserving the architecture required for a
governed production rollout.

## 22. Final sign-off criteria

The release is ready for presentation when:

1. The pull request into `develop` is reviewed and CI passes.
2. The API and web deployments are healthy.
3. Supabase shows all migrations applied.
4. The fictional seed is available for connected testing.
5. The mobile Expo build opens and camera permission is verified.
6. Product, Design, Technical Writing, Frontend, Mobile, Backend, and QA confirm
   that their handoff sections match this document.
7. No deferred feature is presented as completed.
