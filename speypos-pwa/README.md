# SpeyPOS PWA

Frontend POS/admin client for SpeyPOS local backend.

## Stack

1. React + TypeScript
2. Vite
3. Tailwind + shadcn/ui

## Local Development

From `speypos-pwa`:

```sh
npm install
npm run dev
```

Default backend target is `http://localhost:8080` (see `src/lib/api.ts`).

## Build

```sh
npm run build
npm run preview
```

## Android/Termux Deployment Model

1. Backend (`speypos-local`) runs in Termux and serves API + static assets.
2. PWA build artifacts are served by backend static hosting from `speypos-local/public`.
3. Backend health endpoint (`/api/health`) is used by reboot polling flows in admin pages.

## Operational Notes

1. If backend is restarting, temporary `healthApi.check()` failures are expected.
2. Admin UI now surfaces system degraded/recovering state from `/api/system/pending-actions`.
3. Keep backend `CORS_ORIGIN` aligned with the URL used to open the PWA.
