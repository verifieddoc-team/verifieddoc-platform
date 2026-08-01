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
- `apps/web`: React and Vite responsive web application
- `apps/mobile`: Expo and React Native holder application
- `apps/mobile-old`: archived pre-Router mobile reference, excluded from active workspaces
- `packages/contracts`: shared, safe TypeScript API contracts
- `docs`: product, API, security, and team documentation

## Start the API

### Windows PowerShell

```powershell
npm install
Copy-Item apps\api\.env.example apps\api\.env
npm run db:generate --workspace=@verifieddoc/api
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npm run dev
```

Optional fictional demo seed:

```powershell
$env:ALLOW_DEMO_SEED = "true"
$env:DEMO_PASSWORD = "DemoPass1!"
npm run db:seed --workspace=@verifieddoc/api
```

Run tests:

```powershell
npm run validate
```

## Start the web application

Copy the example environment file, then start Vite:

```powershell
Copy-Item apps\web\.env.example apps\web\.env
npm run dev:web
```

```bash
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

The web application opens at `http://localhost:5173`. Its default development
configuration enables fictional demo workspaces. Set `VITE_DEMO_MODE=false`
when validating the public verification and authentication flows exclusively
against the API.

## Start the mobile application

Copy the example environment file, then start Expo:

```powershell
Copy-Item apps\mobile\.env.example apps\mobile\.env
npm run dev:mobile
```

```bash
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile
```

Use the LAN address of the API in `EXPO_PUBLIC_API_BASE_URL` when testing on a
physical phone. `localhost` on a phone refers to the phone, not the development
computer.

## Fictional product demo

- Web role workspaces: Holder, Organization, Verifier, and Platform Admin
- Mobile holder wallet: sign-in, credential detail, sharing, QR, and verification
- Public verification token: `DEMO-VERIFIED-2026`
- Demo data domain: `@example.test`

The demo does not require real personal or organization data.

### POSIX (bash/zsh)

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:generate --workspace=@verifieddoc/api
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npm run dev
```

Optional fictional demo seed:

```bash
ALLOW_DEMO_SEED=true DEMO_PASSWORD='DemoPass1!' npm run db:seed --workspace=@verifieddoc/api
```

Run tests:

```bash
npm run validate
```

## PostgreSQL

Start a local PostgreSQL instance with a database matching `DATABASE_URL` in `apps/api/.env`. The default example uses:

```text
postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc?schema=public
```

Apply migrations after generating Prisma Client:

```bash
npm run db:generate --workspace=@verifieddoc/api
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

## API URLs

- API base: `http://localhost:4000/api/v1`
- Liveness: `http://localhost:4000/api/v1/health`
- Readiness: `http://localhost:4000/api/v1/ready`
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/openapi.json`

## Platform admin bootstrap

For controlled first-time platform admin creation:

```bash
ALLOW_ADMIN_BOOTSTRAP=true ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='AdminPass1!' npm run db:bootstrap-admin --workspace=@verifieddoc/api
```

Disable bootstrap immediately afterward by setting `ALLOW_ADMIN_BOOTSTRAP=false` or removing it from the environment.

## Integration guide

See [docs/API-INTEGRATION.md](docs/API-INTEGRATION.md) for authentication, roles, endpoint groups, pagination, sharing, invitations, and demo-data rules.

See [docs/FINAL-PRODUCT-HANDOFF.md](docs/FINAL-PRODUCT-HANDOFF.md) for the
completed scope, team ownership boundaries, screen map, testing checklist, and
safe modification workflow. See [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) for
the final presentation sequence.

The final presentation PRD is [docs/PRD-v2-FINAL.md](docs/PRD-v2-FINAL.md).

## Render deployment

The repository includes `render.yaml` for a Node API service and a Vite static
web service. The API build generates Prisma Client, compiles TypeScript, applies
migrations in the pre-deploy step, starts from `dist/src/server.js`, and uses
`/api/v1/ready` as its database-aware health check.

Configure these values in Render without committing their values:

- API: `DATABASE_URL`, `CORS_ORIGINS`, `PUBLIC_WEB_URL`
- Web: `VITE_API_BASE_URL`

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated by the Blueprint.
`CORS_ORIGINS` must contain the deployed web origin without a trailing slash.
`PUBLIC_WEB_URL` must contain the same public web origin so generated
verification and invitation links open the correct client.

## Collaboration

Create work from an issue, branch from `develop`, and open a pull request back to `develop`. Do not commit directly to `main` or `develop`. See [CONTRIBUTING.md](CONTRIBUTING.md).
