# VerifiedDoc Frontend API Contract

Figma-derived screen flows, frontend-only routes, and screen→API matrices: **[`docs/FIGMA-USER-FLOW.md`](./FIGMA-USER-FLOW.md)**.
Contract gap audit: **[`docs/API-CONTRACT-AUDIT.md`](./API-CONTRACT-AUDIT.md)**.

Cursor could not authenticate directly to Figma. This flow was produced from a separately verified Figma screen inventory supplied during review. The Figma file contains the relevant screens but has no configured prototype interaction links. Frontend routes in the Figma flow doc are **UI routes only** — do not invent matching backend paths.

## API base URL

Documented staging example (documentation only — do **not** hardcode in runtime app code):

```text
https://verifieddoc-platform-production.up.railway.app/api/v1
```

Local default used by clients when env vars are unset:

```text
http://localhost:4000/api/v1
```

**Rules**

- Web runtime: `VITE_API_BASE_URL` (must already include `/api/v1`).
- Mobile runtime: `EXPO_PUBLIC_API_BASE_URL` (must already include `/api/v1`).
- Append endpoint paths such as `/auth/login` or `/holder/dashboard`.
- **Never** call the base URL alone (never `fetch(apiBaseUrl)` with an empty path).
- **Never** hardcode the Railway production host in React components, services, tests, or mobile screens.
- Authenticated calls require:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Error envelope:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Common errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

---

## Authentication

### Register — Auth

- **Method / path:** `POST /auth/register`
- **Role:** Public
- **Headers:** `Content-Type: application/json`
- **Request:**

```json
{
  "email": "holder@example.com",
  "password": "Str0ng-Pass!",
  "firstName": "Amara",
  "lastName": "Ndlovu",
  "role": "HOLDER"
}
```

`role` optional; allowed values `HOLDER` | `VERIFIER` (default `HOLDER`).

- **Success `201`:**

```json
{
  "user": {
    "id": "clx...",
    "email": "holder@example.com",
    "firstName": "Amara",
    "lastName": "Ndlovu",
    "role": "HOLDER",
    "createdAt": "2026-08-05T12:00:00.000Z",
    "updatedAt": "2026-08-05T12:00:00.000Z"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>"
}
```

- **Errors:** `400`, `409`, `429`
- **Usage:**

```ts
await api.register({ email, password, firstName, lastName, role: "HOLDER" });
```

### Login — Auth

- **Method / path:** `POST /auth/login`
- **Role:** Public
- **Request:** `{ "email", "password" }`
- **Success `200`:** AuthSession (same shape as register)
- **Errors:** `401`, `429`
- **Usage:** `await api.login(email, password)`

### Refresh — Auth

- **Method / path:** `POST /auth/refresh`
- **Role:** Public
- **Request:** `{ "refreshToken" }`
- **Success `200`:** AuthSession (rotated refresh token)
- **Errors:** `401`, `429`
- **Usage:** `await api.refresh(refreshToken)`

### Logout — Auth

- **Method / path:** `POST /auth/logout`
- **Role:** Public (no Bearer)
- **Request:** `{ "refreshToken" }`
- **Success `204`:** empty body
- **Usage:** `await api.logout(refreshToken)`

### Current user — Auth / Profile

- **Method / path:** `GET /auth/me`
- **Role:** Any authenticated platform role
- **Headers:** Bearer
- **Success `200`:** `{ "user": PublicUser }`
- **Errors:** `401`
- **Usage:** `await api.me(accessToken)`

---

## Holder dashboard

### Get holder dashboard — Holder

- **Method / path:** `GET /holder/dashboard`
- **Role:** `HOLDER`
- **Headers:** Bearer
- **Success `200`:**

```json
{
  "holder": {
    "id": "clx...",
    "email": "holder@example.com",
    "firstName": "Amara",
    "lastName": "Ndlovu",
    "role": "HOLDER"
  },
  "stats": {
    "total": 3,
    "active": 1,
    "expired": 1,
    "revoked": 1
  },
  "recentCredentials": []
}
```

Stats use **effective** credential status. Live web UI labels map 1:1:

| Label | Field |
| --- | --- |
| Total credentials | `stats.total` |
| Active credentials | `stats.active` |
| Expired credentials | `stats.expired` |
| Revoked credentials | `stats.revoked` |

Do not invent extra fields (pending verifications, shared-this-month, fabricated recent activity) unless the API adds them from real data.

- **Errors:** `401`, `403`
- **Usage:** `await api.getHolderDashboard(accessToken)`

---

## Credentials (holder wallet)

### List wallet — Holder

- **Method / path:** `GET /credentials?page=1&limit=50`
- **Role:** Authenticated holder (wallet scoped to `req.user`)
- **Optional query:** `status=ACTIVE|EXPIRED|REVOKED`
- **Success `200`:** `{ data: HolderCredentialSummary[], pagination }`
- **Usage:** `await api.listWallet(accessToken)`

### Credential detail — Holder / Org issuer

- **Method / path:** `GET /credentials/:credentialId`
- **Role:** Credential holder **or** org ADMIN/ISSUER of issuing org
- **Success `200`:** `{ "credential": SafeCredential }`
- **Errors:** `401`, `403`, `404`
- **Usage:** `await api.getCredential(accessToken, credentialId)`

---

## Share links — Holder

### Create share link

- **Method / path:** `POST /credentials/:credentialId/share-links`
- **Role:** Credential holder
- **Request:**

```json
{
  "expiresInHours": 72,
  "maxViews": 10,
  "disclosedClaims": ["grade"],
  "includeHolderName": true,
  "includeReferenceNo": false
}
```

- **Success `201`:** `{ shareLink, token, verificationPath, verificationUrl }` — raw token once only
- **Usage:** `await api.createShareLink(accessToken, credentialId, input)`

### List share links

- **Method / path:** `GET /credentials/:credentialId/share-links`
- **Success `200`:** `{ data: ShareLinkSummary[] }`
- **Usage:** `await api.listShareLinks(accessToken, credentialId)`

### Revoke share link

- **Method / path:** `PATCH /credentials/:credentialId/share-links/:shareLinkId/revoke`
- **Success `200`:** `{ shareLink }`
- **Usage:** `await api.revokeShareLink(accessToken, credentialId, shareLinkId)`

---

## Public verification — Verifier / Public

### Verify by share token

- **Method / path:** `GET /verify/:token`
- **Role:** Public (rate-limited)
- **Success `200`:**

```json
{
  "result": "VALID",
  "credential": {
    "publicId": "VD-...",
    "title": "Applied Software Engineering",
    "credentialType": "PROFESSIONAL_CERTIFICATE",
    "effectiveStatus": "ACTIVE",
    "issuedAt": "2026-07-01T00:00:00.000Z",
    "expiresAt": null,
    "organization": { "name": "Northwind Institute", "slug": "northwind" },
    "holderName": "Amara Ndlovu",
    "claims": { "grade": "Distinction" }
  }
}
```

- **Errors:** generic unavailable for invalid/expired/revoked/exhausted tokens (do not leak reason codes to UI beyond safe messaging)
- **Usage:** `await api.verifyCredential(token)`

There is **no** `POST /verifier/verify` and **no** `/verifier/me/dashboard` in the current API.

---

## Organizations — Issuing organization

### Apply

- **Method / path:** `POST /organizations`
- **Role:** Any authenticated user
- **Request:** `{ name, slug, contactEmail, country, registrationNumber?, website?, description? }`
- **Success `201`:** `{ organization, membershipRole: "ORGANIZATION_ADMIN" }`
- **Usage:** `await api.createOrganization(accessToken, input)`

### List my organizations

- **Method / path:** `GET /organizations`
- **Success `200`:** `{ organizations: OrganizationMembershipView[] }`
- **Usage:** `await api.listOrganizations(accessToken)`

### Get organization

- **Method / path:** `GET /organizations/:organizationId`
- **Role:** Member
- **Success `200`:** `{ organization, membershipRole }`
- **Usage:** `await api.getOrganization(accessToken, organizationId)`

### Issue credential

- **Method / path:** `POST /organizations/:organizationId/credentials`
- **Role:** `ORGANIZATION_ADMIN` | `ORGANIZATION_ISSUER` (org must be VERIFIED)
- **Request:**

```json
{
  "holderEmail": "holder@example.com",
  "title": "Applied Software Engineering",
  "credentialType": "PROFESSIONAL_CERTIFICATE",
  "referenceNo": "NW-100001",
  "issuedAt": "2026-07-23T00:00:00.000Z",
  "description": "Completed programme",
  "claims": { "outcome": "Completed" }
}
```

- **Success `201`:** `{ credential: SafeCredential }`
- **Usage:** `await api.issueCredential(accessToken, organizationId, input)`

### List issued credentials

- **Method / path:** `GET /organizations/:organizationId/credentials`
- **Success `200`:** paginated organization credential summaries (includes holder)
- **Usage:** `await api.listOrganizationCredentials(accessToken, organizationId)`

### Revoke credential

- **Method / path:** `PATCH /organizations/:organizationId/credentials/:credentialId/revoke`
- **Request:** `{ "reason": "Issued in error" }` (5–1000 chars)
- **Success `200`:** `{ credential }`
- **Usage:** `await api.revokeOrganizationCredential(accessToken, organizationId, credentialId, { reason })`

### Members

| Action | Method / path |
| --- | --- |
| List | `GET /organizations/:organizationId/members` |
| Update role | `PATCH /organizations/:organizationId/members/:userId` body `{ role }` |
| Remove | `DELETE /organizations/:organizationId/members/:userId` → 204 |

### Invitations

| Action | Method / path |
| --- | --- |
| Create | `POST /organizations/:organizationId/invitations` |
| List | `GET /organizations/:organizationId/invitations` |
| Revoke | `PATCH /organizations/:organizationId/invitations/:invitationId/revoke` |
| Accept | `POST /invitations/accept` body `{ token }` (Bearer; email must match) |

Invitation URLs use fragment tokens: `/invitations/accept#token=<encodeURIComponent(token)>`.

### Organization audit logs

- **Method / path:** `GET /organizations/:organizationId/audit-logs`
- **Role:** `ORGANIZATION_ADMIN`
- **Usage:** `await api.listOrganizationAudit(accessToken, organizationId)`

There is **no** `/organizations/me/dashboard` or `/organizations/me/portal`.

---

## Platform admin

### List organizations for review

- **Method / path:** `GET /admin/organizations?status=PENDING`
- **Role:** `PLATFORM_ADMIN`
- **Success `200`:** paginated `AdminOrganization[]`
- **Usage:** `await api.listAdminOrganizations(accessToken)`

### Review organization

- **Method / path:** `PATCH /admin/organizations/:organizationId/review`
- **Request:**

```json
{ "decision": "APPROVE" }
```

or

```json
{ "decision": "REJECT", "rejectionReason": "Registration evidence incomplete." }
```

Do **not** send `VERIFIED` / `REJECTED` as `decision`. Those are organization status values in responses.

- **Success `200`:** `{ organization }`
- **Usage:** `await api.reviewOrganization(accessToken, organizationId, { decision: "APPROVE" })`

### Platform audit logs

- **Method / path:** `GET /admin/audit-logs`
- **Role:** `PLATFORM_ADMIN`
- **Usage:** `await api.listAdminAuditLogs(accessToken)`

---

## System

| Feature | Method / path | Auth | Success |
| --- | --- | --- | --- |
| Liveness | `GET /health` | Public | `{ status: "ok", service, version }` |
| Readiness | `GET /ready` | Public | `{ status: "ready", service }` or 503 unavailable |

---

## Web / mobile client helpers

| Client | File |
| --- | --- |
| Web | `apps/web/src/lib/api.ts` |
| Mobile | `apps/mobile/src/services/api.js` |
| Shared types | `packages/contracts/src/index.ts` |

Demo mode (`VITE_DEMO_MODE` default on) keeps fictional workspace data. When demo mode is **disabled** and a session exists, web workspaces call the endpoints above with Bearer tokens.

### Session / token handling (current security model)

- Access and refresh tokens stay in React memory (`AuthSession` state) only.
- Do **not** persist tokens in `localStorage` / `sessionStorage` for this change set.
- Do **not** put tokens in URLs (invitation tokens use the URL **fragment** `#token=…`, then are stripped from history).
- Do **not** log access or refresh tokens.
- Browser refresh clears the in-memory session. `POST /auth/refresh` is available via `api.refresh`, but automatic refresh is not wired yet.

### Membership-aware navigation (web)

After login/register, clients should:

1. `GET /auth/me` (or use session `user` from login response)
2. `GET /organizations`
3. Resolve available workspaces

Rules:

- `PLATFORM_ADMIN` → Admin workspace
- membership `ORGANIZATION_ADMIN` | `ORGANIZATION_ISSUER` → Organization workspace
- `VERIFIER` → Verifier workspace
- `HOLDER` → Holder workspace
- A HOLDER may also have organization memberships — **preserve Holder access** when org workspace is available
- Organization roles come from **membership data**, never from `PlatformRole`

Current web interim routes: `/app/holder`, `/app/organization`, `/app/verifier`, `/app/admin`.
Target Figma-aligned frontend routes (not backend paths): see `docs/FIGMA-USER-FLOW.md` §2.

Mobile screens that still use stubs are **implemented but not wired**.

### Target frontend page routes (UI only)

```text
/login  /register  /forgot-password  /verify-otp  /reset-password  /password-updated

/holder/dashboard  /holder/credentials  /holder/credentials/:credentialId
/holder/share  /holder/activity  /holder/settings

/verifier/dashboard  /verifier/verify  /verifier/results
/verifier/history  /verifier/saved-organizations  /verifier/settings

/organization/dashboard  /organization/credentials/new  /organization/credentials
/organization/verification-requests  /organization/profile

/admin/dashboard  /admin/organization-approvals  /admin/organizations
/admin/activity  /admin/fraud-alerts  /admin/reports
```

UI routes are not API paths. Prefer the catalog in `docs/BACKEND-ENDPOINT-CATALOG.md` when wiring screens — several Figma routes now have matching backend endpoints (e.g. `GET /holder/activity`).

### Holder dashboard field rule

Live UI may show API-backed fields from `GET /holder/dashboard`:

- `stats.total` → Total Credentials
- `stats.active` → Active Credentials
- `stats.expired` → Expired Credentials
- `stats.revoked` → Revoked Credentials
- `stats.pendingVerifications` → Pending Verifications (additive; backend now returns this)
- `stats.sharedThisMonth` → Shared This Month (additive; backend now returns this)
- `recentCredentials` → Recent Credentials
- `recentActivity` → Recent Activity (additive)

Never fabricate metric values when fields are absent from the response. Prefer additive consumption of new fields; keep older clients working without them.

---

## New backend endpoints (Figma / PRD completion)

Backend now exposes the following (paths relative to `/api/v1`). Full table: [`docs/BACKEND-ENDPOINT-CATALOG.md`](./BACKEND-ENDPOINT-CATALOG.md). Shared types: `@verifieddoc/contracts`.

| Area | Endpoints (summary) |
| --- | --- |
| Auth profile / reset | `PATCH /auth/me`, `PATCH /auth/me/password`, `POST /auth/password-reset/{request,verify,confirm}` |
| Holder | `GET /holder/activity`, `GET /holder/verification-requests`, `GET|POST|DELETE /holder/documents…` |
| Verifier | `GET /verifier/dashboard`, `POST|GET /verifier/verifications`, saved-organizations, verification-requests, file-verifications |
| Organization | `PATCH /organizations/:id`, `GET …/dashboard`, recipients + recipient-invitations, verification-requests review, registration-documents |
| Credential artifacts | `GET /credentials/:id/artifacts`, org `…/artifacts/upload-url` + `…/complete` |
| Admin | `GET /admin/dashboard`, users + status, verifications, verification-requests, fraud-alerts, reports summary/export |
| Notifications | `GET /notifications`, `PATCH …/read`, `PATCH /notifications/read-all` |

**Frontend wiring status:** web/mobile clients may still be demo-only or unwired for many of these paths — treat that as a frontend task. Do not invent alternate API paths for UI routes.

See `docs/API-CONTRACT-AUDIT.md` and `docs/FIGMA-USER-FLOW.md` for remaining client gaps and design decisions.
