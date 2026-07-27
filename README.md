# VerifiedDoc

**Status:** API complete and functional on the `develop` branch. Web client is built and populated on `develop`, with partial live integration to the API. Mobile client scaffolding exists on `develop`, but no application screens have been built yet — see MVP Scope below for the full per-client breakdown. None of this is yet merged to `main`. Public deployment is not yet live.

*(Visual helper — screenshot, architecture diagram, or badge set: pending, no visual assets exist in the repository yet)*

VerifiedDoc is an employer and organization credential verification platform. Approved Issuing Organizations create structured credential records for registered Credential Holders. Credential Holders decide what to disclose through limited, consent-based share links. Employers and other Verifiers confirm the live issuer-backed record through a secure link or QR-code scan, then make their own independent decision, replacing phone calls, emails, and manual document review with a single trusted verification step.

VerifiedDoc does not inspect uploaded documents with AI, issue credentials on behalf of institutions, or decide whether a candidate should be hired. The Issuing Organization remains the source of truth.

## Table of Contents

- [Core Principles](#core-principles)
- [MVP Scope and Features](#mvp-scope-and-features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Developer Instructions](#developer-instructions)
  - [Prerequisites](#prerequisites)
  - [Local Installation and Setup](#local-installation-and-setup)
  - [Expected Outcome](#expected-outcome)
  - [Running the Web and Mobile Apps](#running-the-web-and-mobile-apps)
  - [Database Setup and Migrations](#database-setup-and-migrations)
  - [Running Tests](#running-tests)
  - [Troubleshooting](#troubleshooting)
- [Building on VerifiedDoc](#building-on-verifieddoc)
- [API Documentation](#api-documentation)
- [Demo Accounts and Testing Data](#demo-accounts-and-testing-data)
- [Security and Privacy Considerations](#security-and-privacy-considerations)
- [Known Limitations and Open Issues](#known-limitations-and-open-issues)
- [Contribution Workflow](#contribution-workflow)
- [Team and Contributions](#team-and-contributions)
- [Support](#support)
- [License](#license)

## Core Principles

- The Issuing Organization is the source of truth. Only Platform Administrator-approved organizations may issue credentials.
- Verification relies on structured records, not visual inspection of uploaded files.
- Credential Holders control sharing through consent-based, expiring links.
- Every sensitive action is auditable.
- Platform roles and organization membership roles remain separate.
- Every tenant-scoped query is restricted by organization membership.

## MVP Scope and Features

The API implements the full feature set below. Web client integration varies by feature. The mobile app currently has no built screens; supporting service code exists but is not yet connected to any interface.

| Capability | API | Web | Mobile |
|---|---|---|---|
| Registration and login | Complete | Connected | Service code exists (`session.js`); no screen built |
| Platform and organization roles | Complete | Role workspaces | Not present in app |
| Organization application and review | Complete | Demonstration workspace | Not present in app |
| Member invitations and management | Complete | Demonstration workspace | Not present in app |
| Credential issuance and revocation | Complete | Demonstration workspace | Not present in app |
| Holder credential wallet | Complete | Demonstration workspace | Service code exists (`api.js`); no screen built |
| Consent-based share links | Complete | Demonstration workflow | Not present in app |
| Public verification | Complete | Connected | Service code exists (`demo.js`); no screen built |
| Organization and platform audit logs | Complete | Demonstration workspace | Not applicable |
| Health, readiness, seed, and admin bootstrap | Complete | Status workspace | Not applicable |

"Demonstration workspace" means the interface exists and can be reviewed, but does not yet perform live write operations against the API. "Connected" means the feature is fully wired to the live API. The mobile app currently shows only Expo's default, unedited starter screen (`src/app/index.jsx`); no login, wallet, share-link, or verification screens have been built, though supporting service files (`api.js`, `session.js`, `demo.js`) exist in `src/services`.

**QR-code verification:** the Credential Holder generates a QR code from a consent-based sharing link, and the Verifier scans it to confirm the credential. This is implemented and confirmed by Backend as a completed MVP feature at the API level. It is not yet reachable through any mobile screen.

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
- **Mobile:** React Native with Expo (SDK 57, `expo ~57.0.8`) and Expo Router. Project is scaffolded on `develop`; application screens are not yet built.
- **API:** Express (Node.js with TypeScript), `express ^5.1.0`.
- **Database:** PostgreSQL, accessed through Prisma (`@prisma/client ^6.12.0`). Nine migrations applied.

## Repository Structure

- `apps/api` — backend API. Contains the Prisma schema, source code, and a test suite of eight files covering authentication, credentials, organizations, invitations, share links, platform operations, and health/logging checks.
- `apps/web` — web client. Populated on `develop` with a complete Vite/React/TypeScript project. Depends on `@verifieddoc/contracts`.
- `apps/mobile` — mobile client. Expo Router project scaffolding exists (`_layout.jsx`, default `index.jsx`) along with service-layer code (`src/services/api.js`, `session.js`, `demo.js`), but no application screens have been built. Does not currently depend on `@verifieddoc/contracts`.
- `apps/mobile-old` — a second, undocumented mobile folder present alongside `apps/mobile`. Contains a full separate project structure of its own — `package.json`, `README.md`, `app.json`, `tsconfig.json`, `.env.example`, `index.js`, `expo-env.d.ts`, a `src` folder, and a single 47KB `App.tsx` file — plus two zero-byte files (`cd`, `code`) that appear to be an accidental commit. Purpose and disposition pending confirmation from Backend.
- `packages/contracts` — shared API request and response type definitions. Currently a dependency of `apps/web` only; not yet used by `apps/api` or `apps/mobile`. Whether mobile is intended to adopt it is pending confirmation from Backend.
- `docs` — contains `TEAM-HANDOFF.md`, `API-INTEGRATION.md`, `DEMO-SCRIPT.md`, and `FINAL-PRODUCT-HANDOFF.md`, covering team ownership, integration rules, demo guidance, and full product handoff. Distinct from the `/openapi.json` and `/docs` (Swagger UI) API routes described below.

## Developer Instructions

### Prerequisites

- Node.js version 22 or higher
- Repository access: public for read access; write access requires an accepted collaborator invite to the verifieddoc-team organization (carried over from an earlier draft — not verified against actual GitHub organization settings this session)

### Local Installation and Setup

1. Clone the repository.
