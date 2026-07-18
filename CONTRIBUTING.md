# Contributing to VerifiedDoc

## Branches

- `main`: stable demonstration releases
- `develop`: integrated team work
- `feature/<issue>-<short-name>`: new work
- `fix/<issue>-<short-name>`: corrections
- `docs/<issue>-<short-name>`: documentation

## Workflow

1. Select or create a GitHub issue with acceptance criteria.
2. Create a branch from `develop`.
3. Keep commits small and use messages such as `feat(api): add credential issuance`.
4. Open a pull request into `develop` and link the issue.
5. Obtain at least one review and pass automated checks.
6. Squash-merge after approval.

Never commit credentials, access tokens, production data, or real identity documents.
