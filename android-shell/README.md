# SpeyPOS Android Shell

This module is the first native Android implementation step for the migration.

## What it does

- Builds a native Android app shell.
- Copies the packaged React frontend from `speypos-pwa/dist` into Android assets.
- Loads the packaged frontend in a full-screen WebView.
- Shows a fallback screen if the frontend cannot load.

## Build flow

1. Run the React WebView build mode:

```sh
npm run pwa:build:android-webview
```

2. Build the Android app in Android Studio or with Gradle from `android-shell`.

## Current shell contract

- The WebView loads `file:///android_asset/web/index.html`.
- Runtime backend/API settings are passed in the URL query string.
- The shell is intentionally thin and does not port backend logic yet.