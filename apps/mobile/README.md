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

This project uses [Expo Router](https://docs.expo.dev/router/introduction) with file-based routing. Screens live in `src/app/`, reusable UI in `src/components/`, and business logic in `src/services/`.