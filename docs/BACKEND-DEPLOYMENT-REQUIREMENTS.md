# Backend Deployment Requirements

Environment variables and operational notes for staging/production. **Do not place secret values in this document or in git.**

## Required / existing core

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | API listen port (default `4000`) |
| `DATABASE_URL` | PostgreSQL connection string (must be non-localhost in production) |
| `JWT_ACCESS_SECRET` | Access JWT signing secret (≥32 chars; explicit in production) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (≥32 chars; explicit in production) |
| `CORS_ORIGINS` | Comma-separated absolute origins (no wildcards with credentials; non-localhost in production) |
| `PUBLIC_WEB_URL` | Absolute public web origin used for invitation / share URLs |

## Terms & privacy

| Variable | Purpose |
| --- | --- |
| `TERMS_VERSION` | Terms version recorded at registration acceptance |
| `PRIVACY_VERSION` | Privacy version recorded at registration acceptance |

## Password reset

| Variable | Purpose |
| --- | --- |
| `PASSWORD_RESET_ENABLED` | `true` \| `false` — when false, reset endpoints return opaque/unavailable responses |
| `PASSWORD_RESET_SECRET` | Secret material for reset challenge hashing (≥32 chars; must be distinct from JWT and email-verification secrets) |

Password reset email delivery also requires Resend configuration below.

## Signup email verification

| Variable | Purpose |
| --- | --- |
| `EMAIL_VERIFICATION_ENABLED` | `true` \| `false` — default `true`; when enabled, public registration does not issue tokens until OTP verify |
| `EMAIL_VERIFICATION_SECRET` | HMAC secret for signup OTP hashes (≥32 chars; **must not** equal `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `PASSWORD_RESET_SECRET`) |
| `EMAIL_VERIFICATION_OTP_TTL_SECONDS` | OTP lifetime (default `600`) |
| `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` | Resend cooldown (default `60`) |
| `EMAIL_VERIFICATION_MAX_ATTEMPTS` | Max invalid OTP attempts per challenge (default `5`) |

Signup verification uses a separate `EmailVerificationChallenge` table from password-reset OTPs.
Existing users are backfilled as verified by migration; new registrations leave `emailVerifiedAt` null until verify succeeds.

When verification is enabled in production without Resend + `MAIL_FROM`, registration/resend fail safely with `503 SERVICE_UNAVAILABLE` (no authenticated session).

## Email (Resend)

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (required for real OTP / transactional email in production) |
| `MAIL_FROM` | Plain email address used by the Resend adapter (e.g. `noreply@example.com`; display-name forms like `VerifiedDoc <noreply@example.com>` are rejected) |

Without Resend + `MAIL_FROM`, password-reset and signup-verification OTP delivery is unavailable in environments that expect real mail. Tests use an in-memory email adapter. Never log OTP values in production adapters.

## Document / artifact uploads (Supabase)

| Variable | Purpose |
| --- | --- |
| `DOCUMENT_UPLOADS_ENABLED` | `true` \| `false` — gates upload features |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for signed upload/download URLs (backend-only) |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name for documents/artifacts |

**Do not use Railway ephemeral filesystem for uploaded files.** Persist objects in Supabase (or equivalent object storage) via signed URLs.

Supabase **signed upload** URLs are fixed at **two hours** by the provider. The API requests them with an empty JSON body (`{}`) and extracts the token from the returned URL query string. Keep the service-role key backend-only; never log signed URLs, tokens, or Authorization headers.

Safe diagnostics (no secrets printed; signed URLs/tokens never printed):

```bash
npm run diagnostics:storage --workspace=@verifieddoc/api
```

## Email diagnostics (Resend)

Safe configuration/delivery check:

```bash
npm run diagnostics:email --workspace=@verifieddoc/api
DIAGNOSTIC_EMAIL_TO=you@example.com npm run diagnostics:email --workspace=@verifieddoc/api
```

Do not use `onboarding@resend.dev` as `MAIL_FROM` in production. Delivery failures are logged with sanitized Resend status/code/message, masked recipient, and sender domain only — never OTP or API keys.

## Fraud detection (optional)

| Variable | Purpose |
| --- | --- |
| `FRAUD_HIGH_RISK_INVALID_THRESHOLD` | Integer threshold for high-risk invalid verification clustering (default `8` if unset) |

Read from process env in fraud-alert helpers; not part of the Zod env schema defaults.

## Production feature completeness

| Feature area | External dependency |
| --- | --- |
| Signup email verification OTP | Resend (`RESEND_API_KEY` + `MAIL_FROM`) when `EMAIL_VERIFICATION_ENABLED=true` |
| Password reset OTP email | Resend (`RESEND_API_KEY` + `MAIL_FROM`) |
| Personal documents, registration documents, credential artifacts, file-hash verification uploads | Supabase storage (`SUPABASE_*` + `DOCUMENT_UPLOADS_ENABLED=true`) |

Resend + Supabase are required for **full** production feature coverage. Core auth (after verification), credentials, share links, verification events, admin aggregates, and notifications function without uploads when those paths are disabled or stubbed.

## Database migrations

- Run `prisma migrate deploy` in staging/production **separately** from application deploy scripts that only start the process.
- Do not rely on `prisma migrate dev` in shared environments.
- Confirm the Figma/PRD foundation migration (and any later migrations) applied successfully before enabling new endpoints that depend on new tables.

## Operational checklist

1. Set explicit production secrets for JWT, database, CORS, `PUBLIC_WEB_URL`, `PASSWORD_RESET_SECRET` (when reset is enabled), and `EMAIL_VERIFICATION_SECRET` (when verification is enabled). Keep those secrets distinct.
2. Apply migrations with `prisma migrate deploy` (includes signup email-verification backfill).
3. Configure Resend for signup verification and password reset (`MAIL_FROM` on a verified domain; not `onboarding@resend.dev`).
4. Configure Supabase storage for document/artifact uploads; keep `DOCUMENT_UPLOADS_ENABLED=false` until storage is ready. Confirm the bucket exists and the service-role key matches the project.
5. Run `npm run diagnostics:storage --workspace=@verifieddoc/api` and optionally `DIAGNOSTIC_EMAIL_TO=… npm run diagnostics:email --workspace=@verifieddoc/api` before enabling features.
6. Optionally tune `FRAUD_HIGH_RISK_INVALID_THRESHOLD`.
7. Verify `/api/v1/health` and `/api/v1/ready` after deploy.

## Password-reset request contract

| Case | HTTP | Body |
| --- | --- | --- |
| Reset disabled | 202 | `{ requestId }` opaque hex |
| Unknown email | 202 | `{ requestId }` opaque hex |
| Known email, delivery OK | 202 | `{ requestId }` opaque hex (same format; also challenge id) |
| Known email, delivery failure | 202 | `{ requestId }` opaque hex (challenge locked server-side) |
| Production + mail not configured | 503 | `SERVICE_UNAVAILABLE` for **all** requests (no existence leak) |

OTP and reset tokens are hashed with HMAC-SHA256 using `PASSWORD_RESET_SECRET`. Plaintext OTP is only sent through the email adapter and is never logged in production adapters.

## Product assumptions requiring PM approval

- **Phone uniqueness:** normalized E.164 phone is globally unique when non-null. The PRD required duplicate-phone rejection; it did not explicitly debate shared phones (family accounts). Treat uniqueness as an engineering assumption until PM confirms.
- **PUBLIC_ID verification:** authenticated Verifiers may look up a credential by `publicId` and receive a limited public summary (no holder email/phone/claims). Unrestricted anonymous public-id search is not exposed.
- **QR vs SHARE_TOKEN:** both use the same share-token verification path; `method` is recorded from the client request for analytics and may be spoofed unless a dedicated QR channel is added later.
- **Admin `documents` metric:** means issued credentials, not personal/registration uploads.

## Security limitations (not claimed as complete controls)

- Uploaded files are validated for MIME allow-list, size, and sanitized path only. **No malware / AV scanning is implemented.** Do not treat uploads as safe content.
- Access JWTs remain valid until expiry unless the user is suspended (suspension is checked on every authenticated request via DB status). Refresh tokens are revoked on suspend/password change/reset.
- Timing side-channels on login/password-reset may still exist even when response bodies are generic.
- Fraud HIGH_RISK for unmatched file hashes is intentionally conservative without a persisted checksum column on `VerificationEvent`.
