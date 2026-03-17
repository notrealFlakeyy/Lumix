# Lumix Driver Native App

This Expo app lives inside the main Lumix repo and targets the existing versioned mobile backend at `/api/mobile/v1`.

## Scope
- Supabase email/password sign-in
- Driver home summary
- Trips list
- Trip detail
- Documents feed
- Time summary with clock in/out
- Trip start/complete
- Checkpoints
- Proof-of-delivery photo capture from camera or photo library

The backend contract already exists in the main app:
- `lib/mobile/contracts.ts`
- `/api/mobile/v1/openapi`

## Environment
Create `apps/mobile/.env` or use Expo environment injection with:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If you run on a real device instead of an emulator, `EXPO_PUBLIC_API_URL` must point to your machine LAN IP or deployed domain, not `localhost`.

An example file is included at `apps/mobile/.env.example`.
There is also a concrete first-device walkthrough in `apps/mobile/FIRST_RUN.md`.

## Commands

```bash
npm install --prefix apps/mobile
npm run start --prefix apps/mobile
npm run start:tunnel --prefix apps/mobile
```

Type-check the Expo app separately:

```bash
npm run type-check --prefix apps/mobile
```

Useful root-level shortcuts also exist:

```bash
npm run mobile:start
npm run mobile:start:lan
npm run mobile:start:tunnel
npm run mobile:type-check
```

## Real Device QA

1. Start the web app with a reachable backend URL.
2. Set `EXPO_PUBLIC_API_URL` to your LAN IP or staging domain.
3. Start Expo with `npm run start:tunnel --prefix apps/mobile` if LAN routing is unreliable.
4. Open the project in Expo Go on a phone.
5. Verify:
   - sign-in succeeds
   - home screen loads current company/driver context
   - trips list opens
   - trip start works
   - checkpoint buttons prompt for location and save live coordinates
   - proof-of-delivery capture works from camera and photo library
   - uploaded proof appears in the trip documents list
   - clock in / clock out works when the Time module is enabled

## Release Builds

This app now includes `apps/mobile/eas.json` with `development`, `preview`, and `production` build profiles.

Typical flow:

```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

For store-ready builds:

```bash
cd apps/mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

Notes:
- Use a deployed API URL for `EXPO_PUBLIC_API_URL` in preview/production builds.
- Make sure the same Supabase project has the mobile API routes, storage bucket, and driver auth links configured.
- iOS builds require Apple credentials; Android builds require Play signing setup if you plan to publish.

## Pre-Release Checklist

- `npm run type-check --prefix apps/mobile`
- `npm run type-check`
- `npm test`
- Confirm `transport-documents` storage bucket exists
- Confirm driver auth users are linked to driver records
- Confirm at least one device test on Android
- Confirm at least one device test on iPhone
- Confirm camera, photos, and location permission prompts are acceptable
- Confirm proof-of-delivery uploads land in trip documents
- Confirm `/api/mobile/v1/openapi` matches the deployed backend

## Notes
- The native app authenticates directly with Supabase and then calls `/api/mobile/v1/*` with `Authorization: Bearer <access token>`.
- The current app focuses on the driver workflow rather than the full office ERP surface.
