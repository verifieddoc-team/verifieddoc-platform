# Auth & Registration Alignment

Canonical backend contracts for signup, email verification, login, and industry metadata.
Inspect web/mobile only as API consumers; this document is the source of truth for mapping.

## Compatibility: existing users and email verification

Migration `20260806120000_add_email_verification`:

- Adds `User.emailVerifiedAt` (nullable).
- Adds `EmailVerificationChallenge` (separate from `PasswordResetChallenge`).
- **Backfills existing users** with `emailVerifiedAt = createdAt` so production accounts are not locked out.
- **New public registrations** leave `emailVerifiedAt` null until OTP verification succeeds.

Verification status is derived from `emailVerifiedAt` only (no parallel boolean that can disagree).

Password-reset OTPs and signup-verification OTPs use different tables, secrets, and endpoints.

## Account types

| Mobile `selectedRoleKey` | Backend `accountType` | Result |
| --- | --- | --- |
| `holder` | `HOLDER` | Personal `PlatformRole.HOLDER` |
| `verifier` | `VERIFIER` | Personal `PlatformRole.VERIFIER` |
| `institution` | `ORGANIZATION` | Issuing organization + `ORGANIZATION_ADMIN` membership; user platform role remains `HOLDER` |

Field mapping:

| Mobile / UI | Backend |
| --- | --- |
| `workEmail` | `email` |
| `industry` | `industry` (singular; prefer stable code) |
| `hrContact` as name string | Prefer `hrContact: { fullName, email, phone? }` (email string alias still accepted temporarily) |

Do **not** send permanent duplicate field names such as both `email` and `workEmail` to the API.
Keep the API canonical and strict; clients own the mapping.

Legacy firstName/lastName registration remains temporarily supported.

## Product decision: Verifier registration

Approved PRD (`docs/PRD-v2-FINAL.md`) defines:

- **HOLDER** — personal credential wallet account.
- **VERIFIER** — personal platform account for verification workflows.
- **Issuing organization** — separate tenant with membership roles (`ORGANIZATION_ADMIN` / `ORGANIZATION_ISSUER`).

The mobile signup screen currently presents organization-style fields for both Verifier and Institution.
The backend **does not** create an issuing `Organization` for `accountType: VERIFIER`.

**Decision (this branch):**

- `HOLDER` is a personal account.
- `VERIFIER` is a personal platform account unless a future approved PRD explicitly defines a verifier-company profile.
- `ORGANIZATION` is the issuing-institution path (Organization row + `ORGANIZATION_ADMIN` membership).

A dedicated `VerifierProfile` model was **not** added: the PRD does not clearly require companyName/industry for Verifier registration as an issuing institution.
If product later requires verifier-company metadata, add `VerifierProfile` rather than reusing the issuing Organization model.

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

Success **200** → `AuthSession` (`user`, `accessToken`, `refreshToken`, optional `organization`).

### Resend

`POST /api/v1/auth/email-verification/resend`

```json
{ "email": "jane@example.com" }
```

**202** generic shape for unknown/verified/suspended where practical:

```json
{
  "verificationRequestId": "opaque-id",
  "expiresInSeconds": 600,
  "resendAvailableInSeconds": 60
}
```

No public `/email-verification/status` endpoint (avoids unnecessary account enumeration).
Mobile countdown should use `expiresInSeconds` / `resendAvailableInSeconds` from register/resend.

## Login unverified gate

After valid credentials, unverified users receive **403**:

```json
{
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Email verification is required",
    "details": {
      "verificationRequired": true,
      "email": "user@example.com",
      "maskedEmail": "u***@example.com"
    }
  }
}
```

## Industries

`GET /api/v1/meta/industries` (public):

```json
{
  "industries": [
    { "code": "HR_RECRUITMENT", "label": "HR & Recruitment" }
  ]
}
```

Approved list matches mobile design (no `OTHER` option).

Organization registration accepts:

1. Stable industry **code** (preferred), or
2. Exact approved **label** (temporary compatibility),

and stores the normalized **code** when recognized.
Unrecognized free-form values are accepted temporarily for backward compatibility and stored trimmed as-is.

Registration uses singular `industry`, not an `industries` array.

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

1. After register, navigate to verify-email with `verificationRequestId`, masked email, and countdown from `expiresInSeconds` / `resendAvailableInSeconds`.
2. Call `POST /auth/email-verification/verify` and `POST /auth/email-verification/resend` — do not only `console.log` and navigate.
3. Map `holder|verifier|institution` → `accountType` as above; send `email` not `workEmail`.
4. Prefer industry **codes** from `GET /meta/industries`.
5. Login: send only email/password; route by `user.role` + memberships.
6. Do not treat login role cards as authorization.
