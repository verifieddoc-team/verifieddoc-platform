# VerifiedDoc web

Responsive web client for public verification, holder wallets, organization
operations, and platform administration.

## Run

```bash
npm run dev --workspace=@verifieddoc/web
```

Copy `.env.example` to `.env` when connecting to a running API. The interface
supports two explicit modes:

- Normal registration and sign-in use the live API and PostgreSQL data.
- The Open demo actions use fictional in-browser data for safe presentation.

Demo mode never silently replaces a failed live request.

## Demo routes

- `/` public product and verification experience
- `/auth` login and registration
- `/app/holder` credential wallet and consent sharing
- `/app/organization` issuing, members, invitations, and audit
- `/app/verifier` verifier workspace
- `/app/admin` platform organization review and audit

## Integration rules

- API contracts come from `@verifieddoc/contracts` and `/openapi.json`.
- The current token-response API uses tab-scoped `sessionStorage`, never
  persistent `localStorage`. A future production hardening may move refresh
  tokens to secure, same-site, HTTP-only cookies.
- Invitation tokens are read from the URL fragment, removed from history, and
  submitted in the POST body.
- Public verification failures remain generic.
- Organization roles are resolved from memberships, not from global user roles.
