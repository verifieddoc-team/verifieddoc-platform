# Auth & Registration Alignment

Canonical backend contracts for signup, email verification, login, organization application, and industry metadata.
Treat `docs/PRD-v2-FINAL.md` as the primary product source of truth.
Inspect web/mobile only as API consumers; this document is the source of truth for mapping.

## Compatibility: existing users and email verification

Migration `20260806120000_add_email_verification`:

- Adds `User.emailVerifiedAt` (nullable).
- Adds `EmailVerificationChallenge` (separate from `PasswordResetChallenge`).
- **Backfills existing users** with `emailVerifiedAt = createdAt` so production accounts are not locked out.
- **New public registrations** leave `emailVerifiedAt` null until OTP verification succeeds.

Verification status is derived from `emailVerifiedAt` only (no parallel boolean that can disagree).

Password-reset OTPs and signup-verification OTPs use different tables, secrets, and endpoints.

Existing users, organizations, and memberships created through the older direct `accountType: ORGANIZATION` registration path are **retained**. That path is no longer accepted.

## Account types (public registration)

| Mobile / UI selection | Backend `accountType` | Result |
| --- | --- | --- |
| `holder` | `HOLDER` | Personal `PlatformRole.HOLDER` |
| `verifier` | `VERIFIER` | Personal `PlatformRole.VERIFIER` |
| `institution` | **Do not send `ORGANIZATION`** | Register as personal `HOLDER`, verify email, then `POST /organizations` |

Canonical Holder and Verifier payloads use **identical personal fields**:

```json
{
  "accountType": "HOLDER",
  "fullName": "Jane User",
  "email": "jane@example.com",
  "phone": "+237670000001",
  "password": "SecurePassword1!",
  "confirmPassword": "SecurePassword1!",
  "acceptedTerms": true
}
```

Verifier differs only by `"accountType": "VERIFIER"`.

Rejected on personal registration:

- `companyName`, `industry`, `country`, `hrContact`, `hrcontact`
- `PLATFORM_ADMIN`
- Client-selected organization membership roles

Sending:

```json
{ "accountType": "ORGANIZATION" }
```

returns **HTTP 400**:

```json
{
  "error": {
    "code": "ORGANIZATION_APPLICATION_REQUIRED",
    "message": "Register a personal Holder or Verifier account, verify the email, then submit an organization application."
  }
}
```

No User, Organization, or membership is created from that rejected request.

Legacy firstName/lastName registration remains temporarily supported for HOLDER/VERIFIER only.

## Institution (issuing organization) two-step flow

Institution selection on the first screen is a **UI navigation choice**, not a database `PlatformRole`.

### Step 1 — Personal registration

`POST /auth/register`

```json
{
  "accountType": "HOLDER",
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "password": "...",
  "confirmPassword": "...",
  "acceptedTerms": true
}
```

A Verifier may also apply for an organization after personal signup; the applicant `PlatformRole` stays `HOLDER` or `VERIFIER`.

### Step 2 — Verify signup OTP

`POST /auth/email-verification/verify` with `{ requestId, otp }`.

### Step 3 — Use the returned access token

### Step 4 — Submit organization application

`POST /organizations` (Bearer)

```json
{
  "name": "...",
  "slug": "...",
  "contactEmail": "...",
  "country": "...",
  "industry": "...",
  "hrContactName": "..."
}
```

PRD-required: `name`, `slug`, `contactEmail`, `country`.
Optional: `registrationNumber`, `website`, `description`, `industry`, `hrContactName`.

Do **not** require `hrContactEmail`, `hrContactPhone`, or an `hrContact` object on create.
When `industry` / `hrContactName` are supplied, store them; keep HR email/phone null unless later set via `PATCH /organizations/:organizationId`.

### Step 5 — Show organization status `PENDING`

Creation + applicant `ORGANIZATION_ADMIN` membership are atomic.

### Step 6 — Platform Admin approves or rejects the organization

Issuing-organization approval is separate from personal signup.

## Product decisions (confirmed)

- Public account registration creates only **HOLDER** or **VERIFIER**.
- **VERIFIER** is a personal platform role.
- An issuing organization is **not** a public auth account type.
- Platform Admin approves/rejects **issuing organizations**, not each individual credential verification.
- Public verification through a valid holder-approved share token or QR is **immediate** and does not require an Admin decision.
- Trust comes from the verified issuer, immutable credential record, current credential status, holder disclosure controls, and secure token — not from requiring Verifier company registration.

A dedicated `VerifierProfile` model was **not** added.

## Login role cards

Login UI role cards (Holder / Verifier / Institution) are **navigation choices only**.

- Login request body is only `{ email, password }`.
- Clients must **not** send `role` as authorization proof (strict schema rejects unknown keys including `role`).
- After login, route using returned `user.role` and organization memberships from organization APIs.
- Organization workspace access remains membership-based; it is never replaced by a client-selected role.

## Registration response (verification enabled)

`POST /api/v1/auth/register` → **201**

```json
{
  "verificationRequired": true,
  "verificationRequestId": "opaque-id",
  "email": "jane@example.com",
  "maskedEmail": "j***@example.com",
  "expiresInSeconds": 600,
  "resendAvailableInSeconds": 60
}
```

No `accessToken`, `refreshToken`, or OTP is returned.
Session tokens are issued only from `POST /auth/email-verification/verify` or later login after verification.

Retry rules:

- Same email, **unverified** account → `409 EMAIL_VERIFICATION_REQUIRED` (use resend endpoint).
- Same email, **verified** account → `409 EMAIL_ALREADY_EXISTS`.

## Email verification endpoints

### Verify

`POST /api/v1/auth/email-verification/verify`

```json
{ "requestId": "opaque-id", "otp": "123456" }
```

Success **200** → `AuthSession` (`user`, `accessToken`, `refreshToken`, optional `organization` when the user already has `ORGANIZATION_ADMIN` membership).

### Resend

`POST /api/v1/auth/email-verification/resend`

```json
{ "email": "jane@example.com" }
```

**202** generic shape for unknown/verified/suspended where practical.

No public `/email-verification/status` endpoint (avoids unnecessary account enumeration).
Mobile countdown should use `expiresInSeconds` / `resendAvailableInSeconds` from register/resend.

## Login unverified gate

After valid credentials, unverified users receive **403** `EMAIL_NOT_VERIFIED`.

## Industries

`GET /api/v1/meta/industries` (public) remains the dropdown source for optional organization-application `industry`.

Organization application accepts:

1. Stable industry **code** (preferred), or
2. Exact approved **label** (temporary compatibility),

and stores the normalized **code** when recognized.
Unrecognized free-form values are accepted temporarily and stored trimmed as-is.

Uses singular `industry`, not an `industries` array.
Do **not** send `industry` on Verifier (or Holder) registration.

## Environment

| Variable | Notes |
| --- | --- |
| `EMAIL_VERIFICATION_ENABLED` | Default `true` |
| `EMAIL_VERIFICATION_SECRET` | ≥32 chars; must not equal JWT or password-reset secrets |
| `EMAIL_VERIFICATION_OTP_TTL_SECONDS` | Default `600` |
| `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` | Default `60` |
| `EMAIL_VERIFICATION_MAX_ATTEMPTS` | Default `5` |
| `RESEND_API_KEY` + `MAIL_FROM` | Required for real email in production (`MAIL_FROM` must be a plain address such as `noreply@example.com`) |

Production fails safely with `503 SERVICE_UNAVAILABLE` when verification is enabled but email delivery is unavailable.

## Message for frontend / mobile teams

1. Public signup creates only personal `HOLDER` or `VERIFIER` accounts with the same fields.
2. Do **not** send `accountType: ORGANIZATION`. Institution flow is personal register → verify OTP → `POST /organizations`.
3. Institution selection on the first screen is not a database `PlatformRole`.
4. Optional org metadata: `industry` (from `GET /meta/industries`) and `hrContactName` on `POST /organizations` only.
5. After register, navigate to verify-email with `verificationRequestId`, masked email, and countdown from `expiresInSeconds` / `resendAvailableInSeconds`.
6. Login: send only email/password; route by `user.role` + memberships.
7. Public share-token verification remains immediate; Platform Admin does not approve each verification.
