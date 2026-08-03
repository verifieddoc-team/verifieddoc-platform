# VerifiedDoc Backend Architecture and API Flow

Verified against the `develop` branch on 3 August 2026.

## Downloadable diagrams

- Backend architecture: [SVG](images/verifieddoc-backend-architecture.svg) | [PNG](images/verifieddoc-backend-architecture.png)
- Credential sharing and verification flow: [SVG](images/verifieddoc-verification-flow.svg) | [PNG](images/verifieddoc-verification-flow.png)

The SVG files are suitable for the repository README, technical documentation, presentations, Google Drive and Figma imports. They remain sharp when resized.

## Backend architecture

![VerifiedDoc backend architecture](images/verifieddoc-backend-architecture.svg)

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB["Web Application<br/>React + Vite"]
        MOBILE["Mobile Application<br/>React Native + Expo"]
        VERIFIER["Public Verifier<br/>Browser or QR Scanner"]
    end

    subgraph Backend["VerifiedDoc API<br/>Node.js + Express 5 + TypeScript"]
        EDGE["HTTP Security Layer<br/>Helmet, CORS, JSON limit<br/>Rate limiting and sanitized logging"]
        PUBLIC["Public Verification<br/>GET /api/v1/verify/:token"]
        PROTECTED["Protected API Routes<br/>Authentication, organizations,<br/>credentials, sharing and audit"]
        ACCESS["Access Control<br/>JWT authentication<br/>Platform and organization RBAC<br/>Request validation"]
        SERVICES["Domain Services<br/>Tenant scoping<br/>Transactions and conditional updates<br/>Safe response construction"]
        DOCUMENTATION["API Documentation<br/>Swagger: /docs<br/>OpenAPI: /openapi.json"]
    end

    subgraph Persistence["Persistence Layer"]
        PRISMA["Prisma ORM<br/>Schema, constraints and migrations"]
        POSTGRES[("Supabase PostgreSQL")]
    end

    WEB -->|"HTTPS and JSON"| EDGE
    MOBILE -->|"HTTPS and JSON"| EDGE
    VERIFIER -->|"Public HTTPS request"| EDGE
    EDGE --> PUBLIC
    EDGE --> PROTECTED
    EDGE --> DOCUMENTATION
    PROTECTED --> ACCESS
    ACCESS --> SERVICES
    PUBLIC --> SERVICES
    SERVICES -->|"Queries, transactions<br/>and audit writes"| PRISMA
    PRISMA --> POSTGRES
```

## Credential sharing and verification flow

![VerifiedDoc credential sharing and verification flow](images/verifieddoc-verification-flow.svg)

```mermaid
sequenceDiagram
    participant H as Holder client
    participant A as VerifiedDoc API
    participant D as Prisma and PostgreSQL
    participant V as Verifier client

    H->>A: POST /auth/login
    A->>D: Validate account and create refresh session
    D-->>A: Account and session data
    A-->>H: Access token and refresh token

    H->>A: POST /credentials/:id/share-links<br/>Bearer token and disclosure choices
    A->>D: Confirm credential ownership
    A->>D: Save SHA-256 token hash, limits and audit log
    D-->>A: Share link created
    A-->>H: Return raw token and verification URL once

    H-->>V: Send secure URL or client-rendered QR
    V->>A: GET /verify/:token
    A->>D: Hash token and atomically claim one view
    A->>D: Read live credential and selected claims
    A->>D: Write verification audit record
    D-->>A: Current credential record
    A-->>V: VALID, EXPIRED, REVOKED or generic unavailable
```

## Verified API groups

| Area | Base endpoints | Access |
| --- | --- | --- |
| System | `GET /api/v1/health`, `GET /api/v1/ready` | Public |
| Authentication | `/api/v1/auth/*` | Public or authenticated, depending on route |
| Organizations | `/api/v1/organizations/*` | Authenticated and tenant scoped |
| Platform review | `/api/v1/admin/organizations/*` | Platform administrator |
| Members and invitations | `/api/v1/organizations/:organizationId/members/*`, `/invitations/*` | Organization administrator or invitee |
| Credential lifecycle | `/api/v1/organizations/:organizationId/credentials/*`, `/api/v1/credentials/*` | Organization member or holder |
| Consent sharing | `/api/v1/credentials/:credentialId/share-links/*` | Credential holder |
| Public verification | `GET /api/v1/verify/:token` | Public and rate limited |
| Audit access | `/api/v1/organizations/:organizationId/audit-logs`, `/api/v1/admin/audit-logs` | Organization or platform administrator |
| API documentation | `/docs`, `/openapi.json` | Public documentation |

## Security boundaries

- Web and mobile clients communicate with the Express API. They do not connect directly to PostgreSQL or Supabase.
- Passwords are stored as bcrypt hashes.
- Access uses short-lived JWT access tokens and rotating refresh tokens.
- Platform roles and organization membership roles are separate.
- Credential, organization and member operations are tenant scoped.
- Share and invitation tokens are stored as SHA-256 hashes.
- The raw share token is returned only when the link is created.
- Verification view consumption is atomic.
- Holder name, reference number and claims are disclosed only when the holder selects them.
- Invalid, expired, revoked and exhausted links return the same generic unavailable response.
- Sensitive headers and verification tokens are redacted from application logs.
- Important operations create audit records.

## QR clarification

The backend returns a secure verification URL. The web or mobile client may render that URL as a QR code. The QR code transports the URL. It does not perform OCR, document scanning or authenticity detection.

## MVP exclusions

The architecture must not show OCR, AI fraud detection, external institution integrations, automated email delivery or downloadable verification reports as completed MVP functionality.
