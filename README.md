# VerifiedDoc

VerifiedDoc is an employer and organization credential verification platform. Authorized organizations issue credentials, holders share them with consent, and verifiers confirm status through a secure link or QR code.

## MVP principles

- The issuing organization is the source of truth.
- Verification is based on structured records, not visual inspection of uploaded files.
- Holders control sharing through consent and expiring links.
- Every sensitive action is auditable.
- Development and demonstrations use fictional data only.

## Repository structure

- `apps/api`: TypeScript REST API
- `apps/web`: web client placeholder
- `apps/mobile`: mobile client placeholder
- `packages/contracts`: shared API contracts placeholder
- `docs`: product, API, security, and team documentation
- `design`: exported design assets and handoff notes

## Start the API

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

The API runs at `http://localhost:4000`. Health is at `/api/v1/health` and interactive API documentation is at `/docs`.

## Collaboration

Create work from an issue, branch from `develop`, and open a pull request back to `develop`. Do not commit directly to `main` or `develop`. See [CONTRIBUTING.md](CONTRIBUTING.md).
