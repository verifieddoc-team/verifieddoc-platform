# Railway backend deployment

Railway hosts the currently active VerifiedDoc API staging deployment.

## Platform summary

| Item | Value |
| --- | --- |
| Hosting provider | Railway |
| Environment | Staging |
| Railway service name | `verifieddoc-platform` |
| Repository layout | npm workspace monorepo |
| API workspace | `@verifieddoc/api` |
| Node.js version | 22+ |
| Database | PostgreSQL hosted through Supabase |
| Schema management | Prisma migrations |
| Health check path | `/api/v1/ready` |
| Deployment owner | Backend Engineering Lead |

## Live staging URLs

- API base: `https://verifieddoc-platform-production.up.railway.app/api/v1`
- Health: `https://verifieddoc-platform-production.up.railway.app/api/v1/health`
- Readiness: `https://verifieddoc-platform-production.up.railway.app/api/v1/ready`
- Swagger UI: `https://verifieddoc-platform-production.up.railway.app/docs`
- OpenAPI JSON: `https://verifieddoc-platform-production.up.railway.app/openapi.json`

`GET /` returns `NOT_FOUND` intentionally. The Railway service is an API only;
the root webpage route is not defined.

## Railway commands

Use these commands in the Railway service settings.

### Build command

```bash
npm run db:generate --workspace=@verifieddoc/api && npm run build --workspace=@verifieddoc/api
```

### Pre-deploy command

```bash
npm run db:deploy --workspace=@verifieddoc/api
```

### Start command

```bash
npm run start --workspace=@verifieddoc/api
```

### Health check

```text
/api/v1/ready
```

## Required environment variables

Configure these variable names in Railway. Do not commit real values, secrets,
passwords, database URLs, or tokens to the repository.

| Name | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment (`production` for the Railway staging service) |
| `DATABASE_URL` | Supabase PostgreSQL connection string for Prisma |
| `JWT_ACCESS_SECRET` | Access-token signing secret (minimum 32 characters) |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret (minimum 32 characters) |
| `CORS_ORIGINS` | Comma-separated absolute frontend origins allowed by CORS |
| `PUBLIC_WEB_URL` | Public web origin used when generating invitation and share links |
| `EMAIL_VERIFICATION_ENABLED` | Usually `true` for production signup OTP gating |
| `EMAIL_VERIFICATION_SECRET` | Distinct ≥32-char secret for signup OTP HMAC (not equal to JWT/password-reset secrets) |
| `PASSWORD_RESET_SECRET` | Distinct ≥32-char secret for password-reset OTP HMAC |
| `RESEND_API_KEY` | Required for real signup-verification and password-reset email |
| `MAIL_FROM` | From address for Resend |

See `docs/BACKEND-DEPLOYMENT-REQUIREMENTS.md` for optional TTL/cooldown vars and full notes.

`CORS_ORIGINS` and `PUBLIC_WEB_URL` must use absolute `http://` or `https://`
origins without trailing paths, query strings, fragments, or embedded
credentials. Coordinate final frontend origins with the Web and Mobile teams
before rotating CORS settings.

## Validation status

The staging API deployment was validated before go-live:

- API tests: 156/156 passed
- Web tests: 4 passed
- Mobile tests: 2 passed
- `npm run validate` passed
- Production API build passed
- Railway deployment is online

## Backend Lead responsibilities

The Backend Engineering Lead owns:

1. **API deployment ownership** — Railway service configuration, releases, and
   rollback decisions for `@verifieddoc/api`.
2. **Database migration management** — Prisma migration review and safe
   application through the Railway pre-deploy command against Supabase
   PostgreSQL.
3. **Environment variable security** — keeping secrets in Railway only, never
   committing `.env` files, database URLs, JWT secrets, passwords, or tokens.
4. **CORS coordination with Frontend** — aligning `CORS_ORIGINS` with deployed
   Web and Mobile origins before client cutover.
5. **API URL handoff to Web and Mobile** — publishing the live staging base URL
   for `VITE_API_BASE_URL` / `EXPO_PUBLIC_API_BASE_URL` consumers.
6. **Health and readiness verification** — confirming `/api/v1/health` and
   `/api/v1/ready` after each deploy before announcing availability.

## Deployment screenshot

![VerifiedDoc Railway staging online](images/verifieddoc-railway-online.png)

Place the real Railway dashboard or service screenshot at:

```text
docs/images/verifieddoc-railway-online.png
```

Do not invent or fabricate a screenshot. Copy the actual Railway online evidence
to that path if the file is not already present.

## Relationship to Render

Railway is the currently active staging deployment.

`render.yaml` remains in the repository as an optional alternate deployment
configuration only. It is not the active staging host for the VerifiedDoc API.
