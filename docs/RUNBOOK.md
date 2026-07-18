# Runbook

## Environment blockers (read first)

- **iOS builds**: require macOS + Xcode 16.x. Not available on this (Windows) development machine, and not virtualizable via Docker (Apple EULA prohibits macOS virtualization on non-Apple hardware). Local iOS builds/simulator runs remain blocked here, but CI iOS builds are now viable: the repo is public, so GitHub-hosted `macos-15` Actions runners are **free and unlimited** (private repos get only 2,000 min/month with a 10x multiplier on macOS, i.e. ~200 effective macOS minutes). Phase 6's Fastlane iOS lane can target `macos-15` in `.github/workflows/` for CI builds and TestFlight uploads; only local day-to-day iOS dev still needs a Mac in hand.
- **Android toolchain**: Ruby, JDK 17, and the Android SDK were not present on this machine at plan start. `TODO(user)`: confirm whether to install these natively on Windows or via a Docker image with JDK + Android SDK preinstalled (Android builds, unlike iOS, are not blocked by Apple's EULA and can run in Linux containers).
- **Supabase project**: reusing the existing `roomie` project ref `zubxuqshcyniosmdztmw` rather than creating a new one. `TODO(user)`: confirm `SUPABASE_ACCESS_TOKEN` access to this project for CI, since it's shared with the still-live `roomie` Next.js web app.
- **Firebase / push**: `google-services.json` and `GoogleService-Info.plist` are placeholders until a Firebase project is created. `TODO(user)`: create the Firebase project and supply real config files.
- **Apple / Google Play credentials**: `APP_STORE_CONNECT_API_KEY_JSON`, `PLAY_JSON_KEY`, Fastlane Match certificates repo — none of these exist yet. `TODO(user)`: provision an Apple Developer account/App Store Connect API key, a Google Play Console service account, and a private `equilibrium-certificates` git repo for Match.
- **Android release keystore**: `TODO(user)`: generate an upload keystore locally and record its location outside version control.

## Phase 0 verification gate results

- `cd app && npx tsc --noEmit` — passes clean.
- `npm run lint` (ESLint + `scripts/check-no-emoji.sh`) — passes clean.
- `npx react-native run-ios --simulator "iPhone 16"` — **blocked**, not attempted. This machine is Windows; there is no path to running Xcode here.
- `npx react-native run-android` — **blocked**, confirmed by running it. Output:
  ```
  'adb' is not recognized as an internal or external command
  error Failed to launch emulator. Reason: No emulators found as an output of `emulator -list-avds`.
  'gradlew.bat' is not recognized as an internal or external command
  error Failed to install the app. Command failed with exit code 1: gradlew.bat app:installDebug ...
  ```
  Root cause: no JDK, no Android SDK (`adb`, `emulator`, `gradlew.bat` unresolvable), no emulator image installed. `TODO(user)`: install JDK 17 + Android Studio/SDK (or provision the Docker-based Android toolchain noted above) before Phase 1's Android verification gates can run.

## Local bootstrap

(filled in as phases complete)
