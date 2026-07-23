# VerifiedDoc Final Demo Script

## Preparation

1. Start PostgreSQL, the API, the web client, and the mobile client.
2. Apply migrations and optionally load the fictional demo seed.
3. Confirm `/api/v1/health`, `/api/v1/ready`, and `/docs`.
4. Open the web landing page and the mobile holder app.
5. Use only fictional `@example.test` data.

Public demonstration token:

```text
DEMO-VERIFIED-2026
```

## Seven-minute presentation

### 1. Problem and product, 45 seconds

Explain that employers often receive credentials that are difficult to confirm.
VerifiedDoc connects a structured record to its issuing organization. It does
not judge a candidate or use visual document inspection.

### 2. Platform trust gate, 60 seconds

Open the Platform Admin workspace. Show a pending organization application,
review its information, and approve it. Explain that an organization cannot
issue until it is approved and that the decision is audited.

### 3. Organization operations, 90 seconds

Open the Organization workspace. Show separate administrator and issuer roles.
Create an issuer invitation, then open the credential issuance form. Issue a
fictional credential to an existing holder. Show the credential registry and
organization audit log.

### 4. Holder wallet and consent, 90 seconds

Open the Holder workspace or mobile app. Show active, expired, and revoked
records. Open an active credential, select disclosed claims, choose access
limits, and create a share link. Emphasize that the holder name is off by
default and the raw token is returned only once.

### 5. Employer verification, 75 seconds

Open the Verifier workspace or scan the QR code in the mobile app. Verify the
credential and show issuer, current status, and only the approved claims. Then
enter an invalid token to show the generic unavailable response.

### 6. Engineering evidence, 60 seconds

Show Swagger/OpenAPI, the readiness endpoint, CI, migrations, and test results.
Explain tenant isolation, atomic lifecycle changes, token hashing, redacted
logging, and sanitized audit records.

### 7. Close, 30 seconds

State the value clearly: VerifiedDoc gives employers a current issuer-backed
record, gives holders control over disclosure, and gives organizations an
auditable way to manage credential trust.

## Questions the team should answer consistently

**Does VerifiedDoc issue the qualification itself?**  
No. An approved organization records a qualification it is authorized to issue.

**Does a valid result mean the employer must accept the candidate?**  
No. The result confirms the source record. The employer makes the final
decision.

**Does the MVP need real data?**  
No. Fictional data proves the workflow safely. Real institutional onboarding
requires consent, governance, and operational agreements.

**Why no OCR or AI fraud detection?**  
The MVP verifies issuer-owned structured records. OCR and external integrations
are later phases with different cost, privacy, and accuracy risks.

**What happens when a link is invalid?**  
The public response is generically unavailable so attackers cannot learn
whether a token existed, expired, was revoked, or reached its view limit.
