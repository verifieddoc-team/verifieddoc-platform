# VerifiedDoc mobile

Expo and React Native client focused on the credential holder experience.

## Included

- Secure sign-in session storage
- Holder credential wallet
- Credential detail and effective status
- Consent-based share-link configuration
- QR code generation for a new share URL
- Camera or manual token verification
- Fictional offline demo data for design and QA

## Run

```bash
npm run start --workspace=@verifieddoc/mobile
```

Copy `.env.example` to `.env` before connecting to a deployed API. Demo mode is
enabled by default and never requires real personal data.

## Project structure

This project uses Expo SDK 57 and
[Expo Router](https://docs.expo.dev/router/introduction) with file-based
routing. Screens live in `src/app/`, reusable UI in `src/components/`, session
and wallet state in `src/context/`, and API logic in `src/services/`.

The active mobile client is JavaScript and JSX. `apps/mobile-old` is a historical
TypeScript reference only and is excluded from the root workspace commands.

## Quality checks

```bash
npm run lint --workspace=@verifieddoc/mobile
npm run typecheck --workspace=@verifieddoc/mobile
npm test --workspace=@verifieddoc/mobile
npm run build --workspace=@verifieddoc/mobile
```

The build command performs an Expo web export, which verifies Router routes,
native-module resolution, and static rendering. Camera scanning must also be
checked on a physical device or compatible emulator.
