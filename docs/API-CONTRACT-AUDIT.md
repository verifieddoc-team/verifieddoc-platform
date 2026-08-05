# VerifiedDoc API Contract Audit

**Branch:** `fix/frontend-api-contract-alignment`  
**Audit date:** 2026-08-05 (Figma user-flow completion update same day)

## Audit sources (authoritative)

This audit was based on:

1. **PM handover requirements** supplied in the Cursor task brief
2. **Figma-derived user flow** documented in [`docs/FIGMA-USER-FLOW.md`](./FIGMA-USER-FLOW.md) (screen inventory, navigation labels, dashboard cards, tables, buttons, statuses, result screens; Admin node `862:1023`)
3. **Existing frontend and mobile implementation** (`apps/web/**`, `apps/mobile/**`)
4. **Backend routes, Zod schemas, services, Prisma models, and OpenAPI** (`apps/api/src/**`, `apps/api/prisma/schema.prisma`)
5. **Shared contracts** (`packages/contracts/**`)

### Figma review status

Cursor could not authenticate directly to Figma. This flow was produced from a separately verified Figma screen inventory supplied during review. The Figma file contains the relevant screens but has no configured prototype interaction links.

Navigation was **logically derived** from that inventory (including Admin node `862:1023`) — not from prototype edges. The complete flow, screen→route matrix, and screen→API matrix live in `docs/FIGMA-USER-FLOW.md`.

Navigation labels and frontend routes are **never** treated as API paths.

**Figma file:** [VerifiedDoc platform](https://www.figma.com/design/QfOpHB1N0hJNz0g74uEu59/VerifiedDoc---Centralized-Digital-Document-Verification-Platform)  
**Admin dashboard node:** `862:1023`

**Documented staging API base URL (docs/examples only):** `https://verifieddoc-platform-production.up.railway.app/api/v1`  
Runtime web uses `VITE_API_BASE_URL`. Runtime mobile uses `EXPO_PUBLIC_API_BASE_URL`. Clients append relative paths and must not call `/api/v1` alone.

---

## Implementation status legend

| Classification | Meaning |
| --- | --- |
| **Implemented and wired** | Backend endpoint exists; client method exists; web live mode (`VITE_DEMO_MODE=false` + session) calls it |
| **Implemented but not wired** | Backend and/or client method exists; screens still demo-only or unused (especially mobile) |
| **BACKEND_ENDPOINT_MISSING** | Required MVP action has no registered route |
| **DATABASE_MODEL_MISSING** | Feature needs schema/models that do not exist |
| **Deferred P1/P2** | Planned after safe design; not in this change set |
| **Unsupported by current MVP** | Explicitly out of safe MVP scope (`OUTSIDE_CURRENT_MVP`) |

### Matrix status codes

| Status | Meaning |
| --- | --- |
| MATCH | Frontend path/method/body/auth align with a registered backend endpoint |
| FRONTEND_PATH_MISMATCH | Client uses a wrong or non-existent path |
| FRONTEND_METHOD_MISMATCH | HTTP method differs from backend |
| REQUEST_BODY_MISMATCH | Request fields/enums differ from backend schema |
| RESPONSE_SHAPE_MISMATCH | Client expects properties the backend does not return (or wrong names) |
| AUTHORIZATION_MISMATCH | Role/Bearer expectations differ |
| BACKEND_ENDPOINT_MISSING | Required MVP action has no registered route |
| DATABASE_MODEL_MISSING | Feature needs schema/models that do not exist |
| NOT_IMPLEMENTED_IN_FRONTEND | Backend exists; client method or screen wiring missing |
| OUTSIDE_CURRENT_MVP | Explicitly deferred / not in safe MVP scope |

---

## Figma user-flow summary

Full matrices, logical flow diagrams, frontend-only routes, and Admin node `862:1023` inventory: **[`docs/FIGMA-USER-FLOW.md`](./FIGMA-USER-FLOW.md)**.

Global resolve path from Figma structure:

```text
Splash/Onboarding → Register|Login → GET /auth/me → GET /organizations → available workspaces
```

Workspace rules (must remain true in clients):

- `PLATFORM_ADMIN` → Admin
- Org membership `ORGANIZATION_ADMIN` | `ORGANIZATION_ISSUER` → Organization
- `VERIFIER` → Verifier
- `HOLDER` → Holder (may also have org memberships; do not lose Holder access)
- Organization access **never** from `PlatformRole` alone

### Design / PM inconsistencies (from Figma inventory)

| # | Issue | Recommendation |
| --- | --- | --- |
| 1 | Screens show **VerifyDoc** while product is **VerifiedDoc** | Standardize brand string |
| 2 | PM says three primary dashboards but lists four | Confirm Holder + Verifier + Organization + Admin |
| 3 | Verifier card “Total Credentials Issued” | Likely “Total Verifications” (PM approval) |
| 4 | Admin Quick Actions all say “Verified Today” | Treat as unfinished placeholders, not API fields |
| 5 | Admin “Verified At” on Pending/Rejected rows | Use Updated At / Reviewed At / Requested At |
| 6 | Holder upload vs issuer-controlled trust | **Product decision** before any upload API |
| 7 | Organization vs Institution terminology | Standardize copy and schema language |
| 8 | Figma exceeds implemented MVP backend | Explicit MVP vs later cut |

## Unresolved / recently resolved P0 frontend notes

| Item | Decision |
| --- | --- |
| Membership-aware organization navigation | **Resolved (web):** `GET /organizations` → membership roles; platform post-login route via `routeForPlatformRole`; sidebar switch preserves Holder access when org membership exists. |
| Access-token persistence across browser refresh | **Intentionally unchanged.** In-memory session only; no `localStorage`. |
| Mobile screen wiring | **Unresolved P0 (mobile):** `mobileApi` ready; screens mostly stubs. |
| Fake holder metrics (“Pending verifications”, “Shared this month”, activity) | **Not implemented** (correct). Live UI shows only real `stats.total\|active\|expired\|revoked`. Never map those onto unsupported Figma labels. |
| Figma-aligned frontend route tree (`/holder/*`, `/verifier/*`, …) | **Unresolved P0 (routing):** current web uses `/app/holder` etc.; target routes documented in `FIGMA-USER-FLOW.md` only. |

---

## Phase 2 — Canonical endpoints (confirmed against `apps/api/src/app.ts`)

| Method | Canonical path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Public | Liveness |
| GET | `/api/v1/ready` | Public | DB readiness |
| POST | `/api/v1/auth/register` | Public (rate-limited) | Roles: `HOLDER` \| `VERIFIER` only |
| POST | `/api/v1/auth/login` | Public (rate-limited) | |
| POST | `/api/v1/auth/refresh` | Public (rate-limited) | Body: `{ refreshToken }` |
| POST | `/api/v1/auth/logout` | Public | Body: `{ refreshToken }` → 204 |
| GET | `/api/v1/auth/me` | Bearer | |
| GET | `/api/v1/holder/dashboard` | Bearer + `HOLDER` | Stats + 5 recent credentials |
| GET | `/api/v1/credentials` | Bearer | Holder wallet (paginated) |
| GET | `/api/v1/credentials/:credentialId` | Bearer | Holder or org issuer/admin |
| POST | `/api/v1/credentials/:credentialId/share-links` | Bearer (holder) | |
| GET | `/api/v1/credentials/:credentialId/share-links` | Bearer (holder) | |
| PATCH | `/api/v1/credentials/:credentialId/share-links/:shareLinkId/revoke` | Bearer (holder) | |
| GET | `/api/v1/verify/:token` | Public (rate-limited) | |
| POST | `/api/v1/invitations/accept` | Bearer | Body: `{ token }` |
| POST | `/api/v1/organizations` | Bearer | Apply for org |
| GET | `/api/v1/organizations` | Bearer | Memberships for caller |
| GET | `/api/v1/organizations/:organizationId` | Bearer (member) | |
| GET | `/api/v1/organizations/:organizationId/members` | Bearer + org admin | |
| PATCH | `/api/v1/organizations/:organizationId/members/:userId` | Bearer + org admin | |
| DELETE | `/api/v1/organizations/:organizationId/members/:userId` | Bearer + org admin | 204 |
| POST | `/api/v1/organizations/:organizationId/invitations` | Bearer + org admin | |
| GET | `/api/v1/organizations/:organizationId/invitations` | Bearer + org admin | |
| PATCH | `/api/v1/organizations/:organizationId/invitations/:invitationId/revoke` | Bearer + org admin | |
| POST | `/api/v1/organizations/:organizationId/credentials` | Bearer + issuer roles | |
| GET | `/api/v1/organizations/:organizationId/credentials` | Bearer + issuer roles | |
| PATCH | `/api/v1/organizations/:organizationId/credentials/:credentialId/revoke` | Bearer + issuer roles | Body: `{ reason }` |
| GET | `/api/v1/organizations/:organizationId/audit-logs` | Bearer + org admin | |
| GET | `/api/v1/admin/organizations` | Bearer + `PLATFORM_ADMIN` | |
| PATCH | `/api/v1/admin/organizations/:organizationId/review` | Bearer + `PLATFORM_ADMIN` | Body: `{ decision: APPROVE\|REJECT, rejectionReason? }` |
| GET | `/api/v1/admin/audit-logs` | Bearer + `PLATFORM_ADMIN` | |

**Prisma models present:** `User`, `RefreshToken`, `Organization`, `OrganizationMember`, `OrganizationInvitation`, `Credential`, `ShareLink`, `AuditLog`.

**No aliases** were added. Incorrect client paths are corrected to the canonical routes above.

---

## Inconsistency matrix

### Authentication

| Dashboard | Screen/action | Frontend method/path | Backend method/path | Request body | Authentication | Expected response | Status | Classification | Owner of fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Register (web) | `POST /auth/register` | `POST /api/v1/auth/register` | email, password, firstName, lastName, role HOLDER\|VERIFIER | Public | AuthSession | MATCH | Implemented and wired | — |
| Auth | Login (web) | `POST /auth/login` | `POST /api/v1/auth/login` | email, password | Public | AuthSession | MATCH | Implemented and wired | — |
| Auth | Refresh | `api.refresh` client exists; no auto-refresh loop | `POST /api/v1/auth/refresh` | `{ refreshToken }` | Public | AuthSession | MATCH (client) | Implemented but not wired (auto-refresh) | Frontend |
| Auth | Logout | `api.logout` on workspace exit | `POST /api/v1/auth/logout` | `{ refreshToken }` | Public | 204 | MATCH | Implemented and wired | — |
| Auth | Current user | `api.me` exists; profile uses `session.user` | `GET /api/v1/auth/me` | — | Bearer | `{ user }` | MATCH (client) | Implemented but not wired | Frontend |
| Auth | Token storage | In-memory React state only | N/A | — | Bearer | Lost on browser refresh | MATCH (security model) | Documented limitation | — |
| Auth | Forgot password / OTP / create new password | UI / PM brief | *(none)* | — | — | — | DATABASE_MODEL_MISSING | Deferred P1 / Unsupported by current MVP until secure design | Backend |
| Auth | Mobile login roles (`holder`/`verifier`/`institution`) | Local UI strings | `HOLDER`\|`VERIFIER` | role casing | Public | AuthSession | REQUEST_BODY_MISMATCH | Implemented but not wired | Frontend |
| Auth | Mobile login wire-up | Stub | `POST /api/v1/auth/login` | email, password | Public | AuthSession | NOT_IMPLEMENTED_IN_FRONTEND | Implemented but not wired | Frontend |

### Holder

| Dashboard | Screen/action | Frontend method/path | Backend method/path | Request body | Authentication | Expected response | Status | Classification | Owner of fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Holder | Dashboard statistics (web live) | `GET /holder/dashboard` | `GET /api/v1/holder/dashboard` | — | Bearer + HOLDER | `{ holder, stats{total,active,expired,revoked}, recentCredentials }` | MATCH | Implemented and wired | — |
| Holder | Live metric labels | Total / Active / Expired / Revoked **credentials** only | same | — | — | No Pending/Shared labels | MATCH | Implemented and wired | — |
| Holder | PM brief “Pending verifications” | Not rendered in live mode | *(no model)* | — | — | — | DATABASE_MODEL_MISSING | Deferred P1 | Backend |
| Holder | PM brief “Shared this month” | Not rendered in live mode | No aggregate endpoint | — | — | — | BACKEND_ENDPOINT_MISSING | Deferred P1 | Backend |
| Holder | PM brief “Recent activity” | Not rendered in live mode | No activity feed | — | — | — | BACKEND_ENDPOINT_MISSING / DATABASE_MODEL_MISSING | Deferred P1 | Backend |
| Holder | List credentials | `GET /credentials` | `GET /api/v1/credentials` | query | Bearer | Paginated summaries | MATCH | Implemented and wired (web live) | — |
| Holder | Credential details | `GET /credentials/:id` | same | — | Bearer | `{ credential }` | MATCH | Implemented and wired (web live) | — |
| Holder | Share-link CRUD | create/list/revoke client + live wire | share-link routes | Zod create body | Bearer | as OpenAPI | MATCH | Implemented and wired (web live) | — |
| Holder | Mobile wallet / dashboard | `mobileApi` ready; screens static | holder/credentials routes | — | Bearer | — | NOT_IMPLEMENTED_IN_FRONTEND | Implemented but not wired | Frontend |

### Verifier

| Dashboard | Screen/action | Frontend method/path | Backend method/path | Status | Classification | Owner of fix |
| --- | --- | --- | --- | --- | --- | --- |
| Verifier | Verify by share token (web) | `GET /verify/:token` | same | MATCH | Implemented and wired (public + live workspace) | — |
| Verifier | Search by credential ID | — | *(none)* | BACKEND_ENDPOINT_MISSING | Deferred P1 | Backend |
| Verifier | Dashboard / history / saved orgs | Mobile stubs corrected | *(none)* | DATABASE_MODEL_MISSING | Deferred P1/P2 | Backend |
| Verifier | Mobile screens | `mobileApi.verify` unused | `GET /verify/:token` | NOT_IMPLEMENTED_IN_FRONTEND | Implemented but not wired | Frontend |

### Issuing organization

| Dashboard | Screen/action | Frontend method/path | Backend method/path | Status | Classification | Owner of fix |
| --- | --- | --- | --- | --- | --- | --- |
| Org | Membership-aware web navigation | `GET /organizations` after login | same | MATCH | Implemented and wired | — |
| Org | Issue / list credentials (web live) | org credential routes | Zod issue/revoke schemas | MATCH | Implemented and wired | — |
| Org | Members / invitations / audit (web live) | matching routes | Zod invitation schemas | MATCH | Implemented and wired | — |
| Org | Portal aggregates / verification requests | — | *(none)* | BACKEND_ENDPOINT_MISSING / DATABASE_MODEL_MISSING | Deferred P1 | Backend |
| Org | Registration evidence upload | — | *(none)* | DATABASE_MODEL_MISSING | Unsupported by current MVP | Backend |
| Org | Mobile portal stubs | corrected comments; still empty | — | NOT_IMPLEMENTED_IN_FRONTEND | Implemented but not wired | Frontend |

### Platform admin

| Dashboard | Screen/action | Frontend method/path | Backend method/path | Status | Classification | Owner of fix |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | List + review orgs (web live) | admin routes; `decision: APPROVE\|REJECT` | Zod review schema | MATCH | Implemented and wired | — |
| Admin | Audit logs (web live) | `GET /admin/audit-logs` | same | MATCH | Implemented and wired | — |
| Admin | Users / fraud / reports | — | *(none)* | DATABASE_MODEL_MISSING | Deferred P2 | Backend |

---

## Live Holder dashboard labels (web)

When `VITE_DEMO_MODE=false` and a session exists, the holder dashboard uses **only**:

| UI label | API field |
| --- | --- |
| Total Credentials | `stats.total` |
| Active Credentials | `stats.active` |
| Expired Credentials | `stats.expired` |
| Revoked Credentials | `stats.revoked` |
| Recent Credentials | `recentCredentials` |

While the dashboard response is loading, metric values show `—` (not fabricated zeros). Demo-mode metrics remain isolated to demo mode. No “Pending Verifications”, “Shared This Month”, or fabricated “Recent Activity” feed is shown in live mode.

---

## P0 corrections in this change set

1. Shared holder dashboard + auth input contract types  
2. Web/mobile API clients for existing canonical endpoints  
3. Web live wiring for holder / org / admin / verifier / invitation accept  
4. Admin review body uses `APPROVE` / `REJECT`  
5. Membership-aware org workspace access from `GET /organizations`  
6. Live holder metric label/accuracy hardening  
7. Docs: Figma-derived user flow (`FIGMA-USER-FLOW.md`) + status classifications  

**Not fabricated:** pending verifications, fraud alerts, verification history, shared-this-month, password reset, or file uploads.

---

## Deferred P1 / P2 plan

Detailed plan with security constraints: `docs/FIGMA-USER-FLOW.md` §10.

### P1

| Feature | Gap | Safe next step |
| --- | --- | --- |
| Password recovery + OTP | No reset-token / OTP models or endpoints | Hashed, expiring, single-use tokens/OTP; rate + attempt limits; invalidation; password policy; tests — **no partial ship** |
| Holder pending / shared-this-month / activity | No models / aggregates | Additive dashboard fields only from real ShareLink / VerificationRequest / activity data |
| Verifier dashboard + history + saved orgs | No VerificationEvent / SavedOrganization | Persist verification attempts; then dashboard/history/saved-org APIs |
| Org portal dashboard / recipients / verification requests | No aggregate route / VerificationRequest | Aggregate from Credential + members; request queue only if product confirms |
| Admin dashboard / fraud / reports / notifications | No aggregation or FraudAlert/Report/Notification models | Counts from real tables; alerts after rule definition |

### P2 / unsupported until designed

| Feature | Gap | Notes |
| --- | --- | --- |
| Registration evidence / holder upload | No storage provider / DocumentMetadata | **Unsupported by current MVP** without storage, validation, authz, metadata, security design |
| Platform user management | No admin user CRUD | Authz-sensitive |
| Verifier search-by-credential-ID / file verify | No endpoints | Prefer consent share-token verification |
| Credential history timeline | No history table | Possibly AuditLog-derived |

### Missing database models (inventory)

`PasswordResetToken` / `OtpChallenge`, `VerificationEvent`, `VerificationRequest`, `SavedOrganization`, `FraudAlert`, `Report`/`AnalyticsSnapshot`, `Notification`, `DocumentMetadata` (+ storage refs), holder activity projection.

---

## Owner summary

| Owner | Items |
| --- | --- |
| Frontend | Mobile wiring; Figma route tree; multi-workspace picker polish; optional auto refresh (no localStorage); `/auth/me` profile refresh |
| Shared contracts | Holder dashboard types (done) |
| Backend | P1 plan in `FIGMA-USER-FLOW.md` |
| Product | Brand (VerifiedDoc vs VerifyDoc); dashboard count; verifier/admin label fixes; holder upload decision; Org vs Institution; MVP cut |
