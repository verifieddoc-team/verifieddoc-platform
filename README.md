# VerifiedDoc

**Status:** API complete and functional on the `develop` branch. Web and mobile client applications are built and populated on `develop`, with partial live integration to the API (see MVP Scope below for the per-client breakdown). None of this is yet merged to `main`. Public deployment is not yet live.

(Visual helper — screenshot, architecture diagram, or badge set: pending, no visual assets exist in the repository yet)

VerifiedDoc is an employer and organization credential verification platform. Approved Issuing Organizations create structured credential records for registered Credential Holders. Credential Holders decide what to disclose through limited, consent-based share links. Employers and other Verifiers confirm the live issuer-backed record through a secure link or QR-code scan, then make their own independent decision, replacing phone calls, emails, and manual document review with a single trusted verification step.

VerifiedDoc does not inspect uploaded documents with AI, issue credentials on behalf of institutions, or decide whether a candidate should be hired. The Issuing Organization remains the source of truth.

## Core Principles

- The Issuing Organization is the source of truth. Only Platform Administrator-approved organizations may issue credentials.
- Verification relies on structured records, not visual inspection of uploaded files.
- Credential Holders control sharing through consent-based, expiring links.
- Every sensitive action is auditable.
- Platform roles and organization membership roles remain separate.
- Every tenant-scoped query is restricted by organization membership.

## MVP Scope and Features

The API implements the full feature set below. Web and mobile client integration varies by feature — see the table for the current state of each.

| Capability | API | Web | Mobile |
| --- | --- | --- | --- |
| Registration and login | Complete | Connected | Login connected |
| Platform and organization roles | Complete | Role workspaces | Holder scope only |
| Organization application and review | Complete | Demonstration workspace | Not present in app |
| Member invitations and management | Complete | Demonstration workspace | Not present in app |
| Credential issuance and revocation | Complete | Demonstration workspace | Read-only in holder wallet |
| Holder credential wallet | Complete | Demonstration workspace | Connected |
| Consent-based share links | Complete | Demonstration workflow | Demonstration workflow |
| Public verification | Complete | Connected | Connected, with QR scanner |
| Organization and platform audit logs | Complete | Demonstration workspace | Not applicable |
| Health, readiness, seed, and admin bootstrap | Complete | Status workspace | Not applicable |

"Demonstration workspace" means the interface exists and can be reviewed, but does not yet perform live write operations against the API. "Connected" means the feature is fully wired to the live API.

QR-code verification: the Credential Holder generates a QR code from a consent-based sharing link, and the Verifier scans it to confirm the credential. This is implemented and confirmed by Backend as a completed MVP feature.

**Explicitly excluded from this MVP:**
- Integration with external institutions or third-party verification services (WAEC, NYSC, university, or government systems)
- Automated email notifications
- Password recovery
- Downloadable verification reports and advanced analytics dashboards
- OCR or AI-based document authenticity detection
- Additional credential types beyond the current MVP set
- Production bot protection
- Production app-store signing and release automation

## User Roles

- **Credential Holder** — registers, views, shares, and manages their own credentials. (Usage guide: pending)
- **Verifier** — verifies credential status through a secure link or QR-code scan. (Usage guide: pending)
- **Issuing Organization** — registers, submits for approval, and issues credentials to Credential Holders. (Usage guide: pending)
- **Platform Administrator** — monitors platform activity and approves organizations.

## Technology Stack

- **Web:** React with Vite and TypeScript. Built and populated on `develop`; not yet merged to `main`.
- **Mobile:** React Native with Expo (SDK 57, `expo` `~57.0.8`) and Expo Router. Built and populated on `develop`; not yet merged to `main`.
- **API:** Express (Node.js with TypeScript), `express` `^5.1.0`.
- **Database:** PostgreSQL, accessed through Prisma (`@prisma/client` `^6.12.0`). Nine migrations applied.

## Repository Structure

- `apps/api` — backend API. Contains the Prisma schema, source code, and a complete test suite (nine test files covering authentication, credentials, organizations, invitations, share links, platform operations, health, and HTTP logging).
- `apps/web` — web client. Populated on `develop` with a complete Vite/React/TypeScript project.
- `apps/mobile` — mobile client. Populated on `develop` with a complete Expo Router project.
- `apps/mobile-old` — a second, undocumented mobile folder present alongside `apps/mobile`. Contains a single large `App.tsx` file and two zero-byte files (`cd`, `code`) that appear to be an accidental commit. Purpose and disposition pending confirmation from Backend.
- `packages/contracts` — shared API request and response type definitions, used by the API and both clients to stay in sync.
- `docs` — contains `TEAM-HANDOFF.md`, `API-INTEGRATION.md`, `DEMO-SCRIPT.md`, and `FINAL-PRODUCT-HANDOFF.md`, covering team ownership, integration rules, demo guidance, and full product handoff. Distinct from the `/openapi.json` and `/docs` (Swagger UI) API routes described below.

## Developer Instructions

### Prerequisites

- Node.js version 22 or higher
- Repository access: public for read access; write access requires an accepted collaborator invite to the `verifieddoc-team` organization

### Local Installation and Setup

1. Clone the repository.
```bash
git clone https://github.com/verifieddoc-team/verifieddoc-platform.git
```
2. Install dependencies.
```bash
npm install
```
3. Create the API environment file.
```bash
cp apps/api/.env.example apps/api/.env
```
4. Create the web environment file.
```bash
cp apps/web/.env.example apps/web/.env
```
5. Create the mobile environment file.
```bash
cp apps/mobile/.env.example apps/mobile/.env
```
6. Start PostgreSQL.
```bash
docker-compose up -d
```
7. Generate the Prisma client.
```bash
npm run db:generate --workspace=@verifieddoc/api
```
8. Apply database migrations.
```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```
9. Start the API.
```bash
npm run dev:api
```

### Expected Outcome

The API runs at `http://localhost:4000`. The health check responds at `/api/v1/health`. Step 9 starts the API only.

### Running the Web and Mobile Apps

Run each client in its own terminal, separate from the API.

10. Start the web client.
```bash
npm run dev:web
```
11. Start the mobile client.
```bash
npm run dev:mobile
```

### Database Setup and Migrations

`docker-compose.yml` starts PostgreSQL only; it does not start the API. Nine migrations are applied through the command in step 8 above. Demo data can be seeded separately (see Demo Accounts and Testing Data, below).

### Running Tests

```bash
npm test
```
This runs the test suite across all workspaces. The API test suite requires PostgreSQL to be running.

### Troubleshooting

- If `npm install` fails, confirm your Node.js version is 22 or higher: `node --version`.
- If `npm run dev:api` does not start, confirm `apps/api/.env` was created from `apps/api/.env.example`.
- If the API cannot reach the database, confirm `docker-compose up -d` is running and healthy (`docker-compose ps`).

### Building on VerifiedDoc

1. Create a GitHub issue with acceptance criteria before starting work.
2. Branch from `develop` using the pattern `feature/<issue>-<short-name>`, `fix/<issue>-<short-name>`, or `docs/<issue>-<short-name>`.
3. Keep commits small, using messages such as `feat(api): add credential issuance`.
4. Before opening a pull request, run `npm run validate` to check the full quality gate locally (Prisma generate, lint, typecheck, tests, and build, in sequence).
5. Open a pull request into `develop` and link the issue.
6. Obtain at least one review and pass automated checks.
7. Squash-merge after approval.
8. Tested releases are promoted from `develop` to `main` separately.

Never commit credentials, access tokens, production data, or real identity documents.

## API Documentation

The API publishes a full OpenAPI 3.1 contract at `/openapi.json`, covering authentication, organizations, credentials, share links, invitations, platform administration, and public verification. An interactive, browsable version of the same contract is available at `/docs` through Swagger UI. Client applications should integrate against this contract rather than duplicating backend types manually. Contract changes must go through a backend pull request, be reviewed by affected client teams, and be announced before merging.

## Demo Accounts and Testing Data

Fictional accounts and credentials (active, expired, and revoked) are created through a gated seed script. Seeding requires `ALLOW_DEMO_SEED=true` and a `DEMO_PASSWORD` value to be set in the environment; passwords and hashes are never printed to the console. Do not use real credentials, personal information, or organization records for testing. (Pending — actual login details to be shared once public deployment is live.)

## Security and Privacy Considerations

The system enforces the following rules:

1. Platform roles and organization membership roles are kept separate.
2. Only approved organizations can issue credentials.
3. Every tenant-scoped query is restricted by organization membership.
4. Raw refresh, share, and invitation tokens are shown only when required and are stored hashed.
5. Public verification returns only holder-approved fields.
6. Unknown, expired, revoked, and exhausted links return a generic unavailable response.
7. Passwords, tokens, hashes, cookies, and authorization headers never enter logs or audit responses.
8. Issuance, revocation, organization review, invitations, and member changes remain auditable.
9. Development and demonstrations use fictional `@example.test` data only.
10. Database changes require a new migration; applied migrations are never edited.

Authentication uses JWT (`jsonwebtoken`), password hashing uses `bcryptjs`, request security headers use `helmet`, and rate limiting uses `express-rate-limit`.

## Known Limitations and Open Issues

- `apps/web` and `apps/mobile` are built and populated on `develop`, but not yet merged to `main`, and public deployment is not yet live.
- Most operational features in the web client (organization review, invitations, credential issuance, audit logs) run in a demonstration workspace rather than connecting live to the API. Only registration/login, public verification, and system status are fully connected.
- The mobile client connects login, the holder credential wallet, and public verification (with QR scanning) to the live API. Organization- and admin-side features are not present in the mobile app at all.
- `apps/mobile-old` exists alongside `apps/mobile` as an undocumented, apparently legacy folder. Disposition pending confirmation from Backend.
- External institution and third-party verification integration is not yet supported.
- Automated email notifications are not yet implemented.
- Password recovery is not yet available.
- Downloadable verification reports and advanced analytics dashboards are not yet available.

## Contribution Workflow

See Building on VerifiedDoc, above, and [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

## Team and Contributions

(Pending — current team roster and responsibilities from Product Management.)

## Support

(Pending — confirm preferred contact channel.)

## License

(Pending — no LICENSE file currently exists in the repository. Confirm licensing status with Product Management.)
