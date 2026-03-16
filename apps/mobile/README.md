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

## Commands

```bash
npm install --prefix apps/mobile
npm run start --prefix apps/mobile
```

Type-check the Expo app separately:

```bash
npm run type-check --prefix apps/mobile
```

## Notes
- The native app authenticates directly with Supabase and then calls `/api/mobile/v1/*` with `Authorization: Bearer <access token>`.
- The current scaffold focuses on the driver workflow. Signature capture and richer native device integrations can be added on top of the existing versioned API.
