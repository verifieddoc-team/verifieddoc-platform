# VerifiedDoc API Integration Guide

## Base URL

- Development default: `http://localhost:4000/api/v1`
- OpenAPI document: `http://localhost:4000/openapi.json`
- Swagger UI: `http://localhost:4000/docs`

All authenticated requests use:

```http
Authorization: Bearer <accessToken>
```

## Authentication lifecycle

1. Register: `POST /auth/register`
2. Login: `POST /auth/login`
3. Refresh: `POST /auth/refresh`
4. Logout: `POST /auth/logout`
5. Current profile: `GET /auth/me`

Access tokens are short-lived JWTs. Refresh tokens are opaque, stored hashed server-side, and rotated on refresh.

Public registration may create `HOLDER` or `VERIFIER` platform roles only. `PLATFORM_ADMIN` is assigned through controlled bootstrap or internal operations.

## Roles

### Platform roles (`User.role`)

- `HOLDER`: receives and manages credentials
- `VERIFIER`: verifies shared credentials
- `PLATFORM_ADMIN`: global platform administration

### Organization roles (`OrganizationMember.role`)

- `ORGANIZATION_ADMIN`: manage members, invitations, and organization audit logs
- `ORGANIZATION_ISSUER`: issue and revoke credentials

Organization roles never grant platform-wide permissions. Platform roles never grant organization permissions by themselves.

## Main endpoint groups

| Group | Examples |
| --- | --- |
| System | `GET /health`, `GET /ready` |
| Authentication | `POST /auth/register`, `POST /auth/login` |
| Organizations | `POST /organizations`, `GET /organizations/{organizationId}` |
| Members | `GET /organizations/{organizationId}/members` |
| Invitations | `POST /organizations/{organizationId}/invitations`, `POST /invitations/accept` |
| Credentials | `POST /organizations/{organizationId}/credentials`, `GET /credentials` |
| Sharing | `POST /credentials/{credentialId}/share-links` |
| Verification | `GET /verify/{token}` |
| Audit | `GET /organizations/{organizationId}/audit-logs`, `GET /admin/audit-logs` |
| Platform admin | `GET /admin/organizations`, `PATCH /admin/organizations/{organizationId}/review` |

## Error response format

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Pagination

List endpoints return:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Audit endpoints accept `page` and `limit` (`limit` maximum 100).

## Effective credential status

Stored status may be `ACTIVE`, `EXPIRED`, or `REVOKED`. Wallet and organization list filters use effective status:

- `ACTIVE`: not revoked and not past `expiresAt`
- `EXPIRED`: not revoked and past `expiresAt`
- `REVOKED`: revoked regardless of expiry

## Consent sharing and token handling

- Holders create share links for their own credentials.
- Raw share tokens are returned once at creation.
- Public verification uses `GET /verify/{token}`.
- Tokens are hashed before storage and must never be logged or placed in audit responses.

## Invitation fragment handling

Invitation URLs use a URL fragment:

```text
/invitations/accept#token=<encoded-token>
```

Client rules:

1. Read the token from `window.location.hash`
2. Remove the fragment from browser history immediately
3. Submit the token in `POST /invitations/accept` JSON body
4. Never send invitation tokens as API query parameters

## Audit access

### Organization audit

`GET /organizations/{organizationId}/audit-logs`

- Requires `ORGANIZATION_ADMIN`
- Tenant isolation uses the `organizationId` column, not JSON details
- Optional filters: `action`, `resourceType`, `from`, `to`, `page`, `limit`

### Platform audit

`GET /admin/audit-logs`

- Requires `PLATFORM_ADMIN`
- Optional filters: `organizationId`, `actorId`, `action`, `resourceType`, `from`, `to`, `page`, `limit`

Audit responses never include passwords, token hashes, raw tokens, request bodies, authorization headers, or cookies.

## Logging restrictions

- Do not log raw share or invitation tokens
- Do not log password or token hashes
- Do not log authorization headers or cookies
- Public verification and invitation flows must avoid leaking token validity details

## Fictional demo-data policy

Demo seeding is disabled by default and refused in production.

Requirements:

- `ALLOW_DEMO_SEED=true`
- `DEMO_PASSWORD` meeting production password-strength rules
- Fictional `@example.test` accounts only

Demo seed creates a verified organization, memberships, active/expired/revoked credentials, and safe audit records. It does not seed reusable share or invitation tokens.

## Web and mobile integration rules

- Store access tokens in memory or secure platform storage; never persist refresh tokens in plain text in untrusted storage.
- Use the fragment-based invitation flow in browser clients.
- Treat verification and invitation failures as generic unavailable states.
- Use `GET /ready` for deployment health checks that require database connectivity.
- Use `GET /health` for lightweight process liveness only.
- Configure `PUBLIC_WEB_URL` for invitation and share-link URL generation.
- Use explicit CORS origins in production; wildcard credentialed CORS is rejected.
