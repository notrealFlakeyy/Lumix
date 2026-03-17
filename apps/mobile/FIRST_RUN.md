# First Mobile Run

Use this file for the first real Android/iPhone test of the Lumix driver app.

## 1. Create `apps/mobile/.env`

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and use:

```env
EXPO_PUBLIC_API_URL=http://10.17.65.240:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Notes:
- `10.17.65.240` is the current Wi‑Fi IPv4 address detected on this machine on March 17, 2026.
- If your Wi‑Fi changes, this IP may change too. Run `ipconfig` again and update `EXPO_PUBLIC_API_URL` if the phone stops reaching the backend.
- The Supabase values must come from your real Supabase project settings.

## 2. Start the web/backend app

From the repo root:

```bash
npm run dev
```

This should make the backend available at:

```text
http://10.17.65.240:3000
```

## 3. Start the Expo app

In a second terminal, from the repo root:

```bash
npm run mobile:start:tunnel
```

If tunnel is not needed and the phone is on the same Wi‑Fi:

```bash
npm run mobile:start:lan
```

## 4. Open the app on a phone

### Android

1. Install Expo Go from Google Play.
2. Scan the QR code from the Expo terminal.
3. If the app does not load over LAN, switch to the tunnel command above.

### iPhone

1. Install Expo Go from the App Store.
2. Open the Camera app and scan the QR code.
3. If iOS blocks local discovery or the app stalls, use the tunnel command.

## 5. Sign in

Use a Supabase Auth user that:
- belongs to the company you want to test
- has the `driver` role
- is linked to a driver record
- is linked to a workforce employee if you want to test time clocking

## 6. First QA flow

Run this full flow on at least one Android and one iPhone:

1. Sign in successfully.
2. Confirm the home screen loads company and driver info.
3. Open Trips.
4. Open one planned trip.
5. Start the trip with a start odometer.
6. Tap a checkpoint button and allow location access.
7. Confirm checkpoint save succeeds.
8. Complete the trip.
9. Enter recipient name and delivery confirmation.
10. Capture proof of delivery with the camera.
11. Confirm the upload succeeds and appears under Documents.
12. If the Time module is enabled, clock in and clock out.

## 7. Backend prerequisites

Make sure these are already true:

- Supabase migrations are applied
- driver mobile API routes are deployed
- `transport-documents` bucket exists
- storage policies allow the mobile proof upload path
- driver auth links are configured in Settings

## 8. If something fails

Quick checks:

- Phone and laptop are on the same network
- `EXPO_PUBLIC_API_URL` points to the current LAN IP, not `localhost`
- `npm run dev` is still running
- the driver user can access `/api/mobile/v1/me`
- the selected driver has assigned trips
- location, camera, and photos permissions were granted
