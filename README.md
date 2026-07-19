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
npm run lint
npm run typecheck
npm test
npm run build
```

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
npm run lint
npm run typecheck
npm test
npm run build
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

## Collaboration

Create work from an issue, branch from `develop`, and open a pull request back to `develop`. Do not commit directly to `main` or `develop`. See [CONTRIBUTING.md](CONTRIBUTING.md).
