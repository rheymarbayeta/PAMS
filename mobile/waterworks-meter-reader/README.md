# PAMS Waterworks Meter Reader (Expo)

Mobile app scaffold for meter readers to submit water meter readings against assigned water supply systems.

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- PAMS backend running and reachable from the device/emulator

## Setup

```bash
cd mobile/waterworks-meter-reader
npm install
```

Create `.env` (or export before start):

```bash
EXPO_PUBLIC_API_URL=http://192.168.11.17:5040
```

Use your PAMS backend host/port. For Android emulator accessing localhost, use `http://10.0.2.2:5040`.

## Run

```bash
npm start
```

Then press `a` for Android, `i` for iOS simulator, or scan QR with Expo Go.

## Auth

Uses existing PAMS login (`POST /api/auth/login`). Assign the **Meter Reader** role to users and link them to supplies via **Waterworks → Supplies → Readers** in the web admin.

## Screens

| Screen | Route | API |
|--------|-------|-----|
| Login | `/login` | `POST /api/auth/login` |
| Assigned supplies | `/supplies` | `GET /api/waterworks/mobile/supplies` |
| Account list | `/accounts/[supplyId]` | `GET /api/waterworks/mobile/supplies/:id/accounts` |
| Submit reading | `/reading/[accountId]` | `POST /api/waterworks/mobile/readings` |
| Submission history | `/history` | `GET /api/waterworks/mobile/readings/my-recent` |

## Notes

- Readings are submitted as **pending** until a Waterworks Manager verifies them in the web admin.
- Phase 1 requires network connectivity (no offline sync).
- JWT is stored in `expo-secure-store`; re-login when token expires.
