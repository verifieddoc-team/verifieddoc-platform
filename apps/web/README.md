# VerifiedDoc web

Responsive web client for public verification, holder wallets, organization
operations, and platform administration.

## Run

```bash
npm run dev --workspace=@verifieddoc/web
```

Copy `.env.example` to `.env` when connecting to a running API. The interface
starts in fictional demo mode so product, design, and QA teams can review every
role without real personal or organization data.

## Demo routes

- `/` public product and verification experience
- `/auth` login and registration
- `/app/holder` credential wallet and consent sharing
- `/app/organization` issuing, members, invitations, and audit
- `/app/verifier` verifier workspace
- `/app/admin` platform organization review and audit

## Integration rules

- API contracts come from `@verifieddoc/contracts` and `/openapi.json`.
- Do not persist refresh tokens in browser storage.
- Invitation tokens are read from the URL fragment, removed from history, and
  submitted in the POST body.
- Public verification failures remain generic.
