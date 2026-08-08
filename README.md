# VerifiedDoc

**Status:** The backend is feature-complete against the approved PRD/Figma API scope on `develop`. The Railway API is deployed, and the public web application is available at `https://verifieddoc.netlify.app`. Full production coverage for OTP email delivery and document uploads depends on correct Resend and Supabase configuration. Web and mobile integration coverage varies by screen.

**Release Notes:** See [docs/RELEASE-NOTES-v1.0.md](docs/RELEASE-NOTES-v1.0.md) for the current MVP release notes.

VerifiedDoc is an employer and organization credential verification platform. Approved Issuing Organizations create structured credential records for Credential Holders. Credential Holders decide what to disclose through consent-based share links. Employers and other Verifiers confirm the current issuer-backed record through a secure link or QR-code scan and make their own independent decision.

VerifiedDoc does not use AI to visually judge whether an uploaded document is authentic, issue credentials on behalf of institutions, or make hiring or admissions decisions. The Issuing Organization remains the source of truth.

## The Problem It Solves

| Before VerifiedDoc | After VerifiedDoc |
| --- | --- |
| Employers and institutions verify credentials through emails, phone calls, and manual document review. | Verifiers can confirm a credential through a secure link or QR-code scan. |
| Credential holders repeatedly resubmit the same documents. | Holders control reusable, consent-based sharing. |
| Documents can be misplaced, altered, or difficult to confirm. | Approved organizations create structured credential records with live status. |
| Verification delays reduce confidence in hiring, admissions, and licensing decisions. | Verifiers receive an issuer-backed result and make their own independent decision. |

## Table of Contents

- [Core Principles](#core-principles)
- [Recent Backend Updates](#recent-backend-updates)
- [MVP Scope and Features](#mvp-scope-and-features)
- [User Roles and Registration Model](#user-roles-and-registration-model)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Developer Instructions](#developer-instructions)
- [Environment Variables](#environment-variables)
- [Database Setup and Migrations](#database-setup-and-migrations)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)
- [Live Deployments](#live-deployments)
- [Authentication and Organization Onboarding](#authentication-and-organization-onboarding)
- [Storage and Email Integrations](#storage-and-email-integrations)
- [Demo Accounts and Testing Data](#demo-accounts-and-testing-data)
- [Security and Privacy Considerations](#security-and-privacy-considerations)
- [Known Limitations and Operational Notes](#known-limitations-and-operational-notes)
- [Building on VerifiedDoc](#building-on-verifieddoc)
- [Team and Contributions](#team-and-contributions)
- [Support](#support)
- [License](#license)

## Core Principles

- The Issuing Organization is the source of truth.
- Only Platform Administrator-approved organizations may issue credentials.
- Verification is based on structured records and live credential status, not visual inspection of uploaded files.
- Credential Holders control sharing through consent-based, expiring links.
- Platform roles and organization membership roles are stored separately.
- Tenant-scoped operations are restricted by organization membership.
- Sensitive actions are auditable.
- Development and demonstrations use fictional data only.

## Recent Backend Updates

The following backend work is already merged into `develop` and represents the current implementation baseline.

### End-to-end PRD/Figma backend completion

PR #39 completed the backend surface required by the approved PRD, Figma flows, and client contracts, including:

- database and domain-model extensions;
- authentication, profile, password-reset, and suspended-user enforcement;
- credential issuance, listing, revocation, holder wallet, and credential detail;
- authenticated and public verification flows;
- organization dashboard/profile, recipients, invitations, registration documents, and credential artifacts;
- Platform Admin dashboard, users/suspension, fraud alerts, notifications, reports, and CSV export;
- shared contracts, OpenAPI/Swagger coverage, deployment documentation, and production-readiness hardening.

### Signup email verification and login gate

PR #41 added the signup email-verification flow:

- new public registrations remain unverified until OTP verification succeeds;
- no access or refresh tokens are issued before verification;
- `POST /auth/email-verification/verify` verifies the OTP and returns a session;
- `POST /auth/email-verification/resend` supports secure resend behavior;
- login rejects unverified users with `EMAIL_NOT_VERIFIED`;
- signup OTP challenges are separate from password-reset challenges;
- `GET /meta/industries` provides organization industry metadata.

### PRD-aligned registration and organization onboarding

PR #42 aligned registration with the confirmed product flow:

- public account registration creates only `HOLDER` or `VERIFIER` users;
- Holder and Verifier registration use the same personal fields;
- `accountType: ORGANIZATION` is rejected with `ORGANIZATION_APPLICATION_REQUIRED`;
- an institution first creates a personal Holder or Verifier account, verifies email, then applies through `POST /organizations`;
- organization applications start in `PENDING` status;
- Platform Admin approves or rejects issuing organizations;
- public verification through a valid holder-approved share token or QR remains immediate and does not require an Admin decision for each verification.

### Supabase uploads and Resend diagnostics

PR #43 aligned signed uploads and production diagnostics:

- Supabase signed-upload requests use the expected provider contract;
- signed upload URLs use the provider-fixed two-hour lifetime;
- the backend extracts the upload token from the returned signed URL;
- Resend failures use sanitized diagnostics;
- OTPs, API keys, signed URLs, authorization headers, and full recipient addresses are not logged;
- safe storage and email diagnostic scripts are available for staging/production checks.

Latest validation recorded on PR #43:

- API: **268 tests passed**
- Web: **8 tests passed**, build passed
- Mobile: **4 tests passed**
- Contracts build passed
- `npm run validate` passed
- `git diff --check` clean

## MVP Scope and Features

| Capability | Backend/API | Web | Mobile |
| --- | --- | --- | --- |
| Holder/Verifier registration | Complete | Connected/in integration | Screen/service coverage exists |
| Signup email verification OTP | Complete | Client integration required | Client integration required |
| Login/session/refresh | Complete | Connected | Service/screen coverage exists |
| Password recovery/reset | Complete | Client integration required | Client integration required |
| Organization application and approval | Complete | Workspace/in integration | Organization screens exist |
| Organization member invitations | Complete | Workspace available | Limited/no full UI coverage |
| Credential issuance and revocation | Complete | Workspace available | Screen coverage varies |
| Holder credential wallet | Complete | Workspace available | Screen/service coverage varies |
| Consent-based share links | Complete | Demonstration/integration flow | Service coverage varies |
| QR/share-token public verification | Complete | Connected/in integration | Verify screen exists; completeness varies |
| Verification events and verifier workflows | Complete | Workspace available | Screen coverage varies |
| Platform Admin dashboard and user controls | Complete | Admin workspace | Not applicable |
| Fraud alerts, notifications, reports/CSV | Complete | Admin integration varies | Not applicable |
| Document/artifact signed uploads | API implementation complete; requires Supabase configuration | Client upload flow | Client upload flow |
| Health/readiness/admin bootstrap/demo seed | Complete | Status integration | Not applicable |

Client status is intentionally described separately from API status. An API capability being complete does not mean every web or mobile screen is fully wired to it.

### Explicitly outside the current MVP

- Direct integration with WAEC, NYSC, universities, government registries, or other external credential authorities
- OCR or AI document-authenticity judgement
- Malware or antivirus scanning of uploaded files
- Production app-store signing and release automation
- Fully automated external-institution synchronization

## User Roles and Registration Model

### Credential Holder

A personal platform user who can receive, view, manage, and share credentials.

### Verifier

A personal platform user who can perform authenticated verification workflows. Public share-token or QR verification can also be used without requiring a Verifier account.

### Issuing Organization

An organization is **not** a public authentication account type. An applicant first registers a personal Holder or Verifier account, verifies the email, and then submits an organization application. Approved organizations can issue credentials through membership-based organization roles.

### Platform Administrator

A privileged platform role responsible for organization review, platform oversight, user controls, fraud monitoring, and related administrative functions.

Organization membership roles such as `ORGANIZATION_ADMIN` and `ISSUER` are distinct from a user's platform role.

## Architecture Overview

![VerifiedDoc Architecture](IMG_7355.JPG)

This diagram describes the intended architecture. Current client completeness should be interpreted using the MVP Scope table above and the live API contract.

## Technology Stack

- **API:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Web:** React, Vite, TypeScript
- **Mobile:** React Native, Expo, Expo Router
- **Shared contracts:** TypeScript package under `packages/contracts`
- **API hosting:** Railway
- **Web hosting:** Netlify
- **Document/object storage:** Supabase Storage
- **Transactional email:** Resend
- **API documentation:** OpenAPI 3.1 and Swagger UI

Node.js 22 or higher is required by the repository.

## Repository Structure

- `apps/api`: TypeScript REST API, Prisma schema/migrations, services, tests, diagnostics, and OpenAPI integration
- `apps/web`: React/Vite responsive web application
- `apps/mobile`: active Expo/React Native application
- `apps/mobile-old`: archived pre-Router mobile reference excluded from active workspaces
- `packages/contracts`: shared TypeScript API contracts
- `docs`: PRD, API integration, deployment, security, handoff, demo, release notes, and technical-writing documentation

## Developer Instructions

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL, locally or through a configured connection
- Docker/Docker Compose when using the local PostgreSQL setup

### Local Installation and Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/verifieddoc-team/verifieddoc-platform.git
cd verifieddoc-platform
npm install
```

Create environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Generate Prisma Client and apply migrations:

```bash
npm run db:generate --workspace=@verifieddoc/api
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

Start the API:

```bash
npm run dev:api
```

Start the web client in a separate terminal:

```bash
npm run dev:web
```

Start the mobile client in a separate terminal:

```bash
npm run dev:mobile
```

For a physical mobile device, `EXPO_PUBLIC_API_BASE_URL` must point to an API host reachable from that device. `localhost` on a phone refers to the phone itself.

## Environment Variables

Never commit populated secrets or production `.env` files.

### API core

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `PUBLIC_WEB_URL`

### Signup email verification

- `EMAIL_VERIFICATION_ENABLED`
- `EMAIL_VERIFICATION_SECRET`
- optional OTP TTL, resend cooldown, and max-attempt settings

### Password reset

- `PASSWORD_RESET_ENABLED`
- `PASSWORD_RESET_SECRET`

### Resend email

- `RESEND_API_KEY`
- `MAIL_FROM`

`MAIL_FROM` must be a plain email address configured as an allowed sender. Production delivery should use a verified sending domain.

### Supabase document storage

- `DOCUMENT_UPLOADS_ENABLED`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

The Supabase service-role or secret key is backend-only and must never be placed in web or mobile environment variables.

### Web

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_DEMO_MODE=true
```

### Mobile

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
EXPO_PUBLIC_DEMO_MODE=true
```

See [docs/BACKEND-DEPLOYMENT-REQUIREMENTS.md](docs/BACKEND-DEPLOYMENT-REQUIREMENTS.md) for production requirements and safe diagnostics.

## Database Setup and Migrations

The local example database connection is:

```text
postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc?schema=public
```

Generate Prisma Client:

```bash
npm run db:generate --workspace=@verifieddoc/api
```

Apply migrations:

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

Use `prisma migrate deploy` in shared staging or production environments. Do not edit already-applied migrations.

## Running Tests

Run repository validation:

```bash
npm run validate
```

Workspace tests can also be run independently as required. API tests use the dedicated test database configuration described in `apps/api/.env.test.example`.

## Troubleshooting

- If `npm install` fails, confirm Node.js is version 22 or higher with `node --version`.
- If the API does not start, confirm `apps/api/.env` was created and required variables are present.
- If the API cannot reach PostgreSQL, verify `DATABASE_URL` and the database service.
- If OTP delivery fails, verify `EMAIL_VERIFICATION_ENABLED`, `RESEND_API_KEY`, and `MAIL_FROM`, then inspect sanitized provider diagnostics.
- If signed upload generation fails, verify `DOCUMENT_UPLOADS_ENABLED`, Supabase project URL, backend-only server key, and exact storage bucket name.
- Do not paste secrets, OTPs, signed URLs, or service-role keys into issues or logs.

## API Documentation

The API publishes an OpenAPI 3.1 contract at `/openapi.json`. Swagger UI is available at `/docs`.

The contract covers authentication, signup verification, password reset, organizations, credentials, verification, share links, invitations, holder/verifier workflows, platform administration, notifications, reports, uploads, and supporting metadata.

Client applications should integrate against the API contract rather than re-creating backend request and response models manually.

Local URLs:

- API base: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health`
- Readiness: `http://localhost:4000/api/v1/ready`
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/openapi.json`

## Live Deployments

### Backend API

Railway hosts the current deployed API environment. Deployment ownership sits with the Backend Engineering Lead. See [docs/RAILWAY-DEPLOYMENT.md](docs/RAILWAY-DEPLOYMENT.md).

| Item | Value |
| --- | --- |
| Hosting provider | Railway |
| API base | `https://verifieddoc-platform-production.up.railway.app/api/v1` |
| Health | `https://verifieddoc-platform-production.up.railway.app/api/v1/health` |
| Readiness | `https://verifieddoc-platform-production.up.railway.app/api/v1/ready` |
| Swagger | `https://verifieddoc-platform-production.up.railway.app/docs` |
| OpenAPI | `https://verifieddoc-platform-production.up.railway.app/openapi.json` |

`GET /` returns `NOT_FOUND` intentionally because the Railway service exposes the API rather than a root webpage.

### Public web application

The public web deployment is available at:

`https://verifieddoc.netlify.app`

Production web configuration:

```env
VITE_API_BASE_URL=https://verifieddoc-platform-production.up.railway.app/api/v1
VITE_DEMO_MODE=false
```

The API `CORS_ORIGINS` list must contain `https://verifieddoc.netlify.app` as an exact origin without a trailing slash. `PUBLIC_WEB_URL` should use the same public web origin for generated verification and invitation links.

## Authentication and Organization Onboarding

### Personal signup

Public signup accepts only:

- `HOLDER`
- `VERIFIER`

Both use the same personal registration fields. Direct public creation of `ORGANIZATION` or `PLATFORM_ADMIN` accounts is not allowed.

When email verification is enabled, registration returns a pending-verification response and does not issue a session.

### Email verification

1. Register through `POST /api/v1/auth/register`.
2. Enter the OTP sent through the configured email provider.
3. Verify through `POST /api/v1/auth/email-verification/verify`.
4. Use `POST /api/v1/auth/email-verification/resend` when a new challenge is required.
5. After successful verification, the API returns an authenticated session.

Unverified users cannot log in until verification succeeds.

### Institution / Issuing Organization onboarding

1. Register a personal Holder or Verifier account.
2. Verify the signup email.
3. Use the returned access token.
4. Submit `POST /api/v1/organizations` with the organization application.
5. The organization is created with `PENDING` status and the applicant receives organization-admin membership.
6. Platform Admin approves or rejects the organization.

Required organization-application fields are `name`, `slug`, `contactEmail`, and `country`. Optional fields include `registrationNumber`, `website`, `description`, `industry`, and `hrContactName`.

See [docs/AUTH-REGISTRATION-ALIGNMENT.md](docs/AUTH-REGISTRATION-ALIGNMENT.md) for the canonical contract and client mapping.

## Storage and Email Integrations

### Supabase Storage

Document and artifact uploads use signed URLs when `DOCUMENT_UPLOADS_ENABLED=true` and the Supabase variables are configured.

Safe staging or production diagnostic:

```bash
npm run diagnostics:storage --workspace=@verifieddoc/api
```

Uploaded files are stored in Supabase Storage, not on Railway's ephemeral filesystem.

### Resend

Signup verification and password-reset email delivery use Resend when the production email variables are configured.

Safe configuration diagnostic:

```bash
npm run diagnostics:email --workspace=@verifieddoc/api
```

An opt-in delivery test can be run with:

```bash
DIAGNOSTIC_EMAIL_TO=you@example.com npm run diagnostics:email --workspace=@verifieddoc/api
```

Production logs intentionally sanitize provider failures and must not expose OTPs, API keys, signed URLs, tokens, or full recipient addresses.

## Demo Accounts and Testing Data

Fictional accounts and credentials can be created through the gated seed script. Seeding requires:

```text
ALLOW_DEMO_SEED=true
DEMO_PASSWORD=<local-test-password>
```

Run:

```bash
npm run db:seed --workspace=@verifieddoc/api
```

Use fictional data only. Never use real identity documents, production credentials, or personal records in demo or test seed data.

### Platform Admin bootstrap

Controlled first-time admin creation uses the gated bootstrap command:

```bash
ALLOW_ADMIN_BOOTSTRAP=true ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='AdminPass1!' npm run db:bootstrap-admin --workspace=@verifieddoc/api
```

Disable or remove bootstrap variables immediately after the intended administrator has been created.

## Security and Privacy Considerations

- Platform roles and organization membership roles are separate.
- Tenant-scoped operations require organization membership.
- Sensitive token values are protected according to their flow and must not be logged.
- Public verification returns only the disclosure permitted by the share/verification contract.
- Unknown, expired, revoked, or exhausted links return controlled unavailable responses.
- Passwords, OTPs, secrets, tokens, signed upload URLs, cookies, and authorization headers must not be logged.
- Suspended users are blocked by authenticated middleware checks.
- Password-reset and email-verification OTPs use separate secrets and challenge models.
- Credential issuance, revocation, organization review, invitations, and member-management actions remain auditable.
- Development and demos use fictional data.
- Supabase server/service-role keys remain backend-only.

Authentication uses JWT-based access and refresh sessions, password hashing, security headers, rate limiting, request validation, and role/membership authorization controls.

## Known Limitations and Operational Notes

- Full production email delivery depends on a correctly configured Resend API key and verified sender/domain.
- Full document and artifact uploads depend on a correctly configured Supabase project, backend-only server key, and existing storage bucket.
- Uploaded files are MIME, size, and path validated, but malware or antivirus scanning is not implemented.
- External institution and government credential systems are not integrated in the MVP.
- Web API integration varies by workspace and screen.
- Mobile screens exist across major flows, but some remain placeholder or partially integrated.
- Client teams should use the current OpenAPI contract and `docs/AUTH-REGISTRATION-ALIGNMENT.md` when wiring signup and institution flows because the older direct-organization registration path is no longer valid.

## Building on VerifiedDoc

1. Create a GitHub issue with acceptance criteria before starting work.
2. Branch from `develop` using `feature/<issue>-<short-name>`, `fix/<issue>-<short-name>`, or `docs/<issue>-<short-name>`.
3. Keep commits focused and use conventional messages such as `feat(api): add credential issuance`.
4. Open the pull request into `develop` and link the issue.
5. Pass automated validation and obtain the required review.
6. Merge only after approval.

Never commit credentials, access tokens, API keys, production data, or real identity documents.

See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/API-INTEGRATION.md](docs/API-INTEGRATION.md), [docs/FINAL-PRODUCT-HANDOFF.md](docs/FINAL-PRODUCT-HANDOFF.md), [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md), and [docs/PRD-v2-FINAL.md](docs/PRD-v2-FINAL.md).

## Team and Contributions

- **Project Management Team:** coordination, planning, documentation, stakeholder communication
- **Product Management Team:** product research, PRD, backlog, sprint planning, prioritization, UAT, go-to-market strategy
- **Product Design Team:** user research support, user flows, wireframes, UI design, prototype
- **Backend Team:** API, database, authentication, credential/verification business logic, organization/admin workflows, storage/email integrations, deployment, diagnostics, tests, and OpenAPI contracts
- **Frontend Team:** web application interface and API integration
- **Mobile Development Team:** mobile application implementation and API integration
- **Technical Writing Team:** README, release notes, user guides, and product documentation

## Support

VerifiedDoc is a capstone project. Use the repository issue and pull-request workflow for technical collaboration and defect tracking.

## License

No `LICENSE` file is currently included in the repository.

