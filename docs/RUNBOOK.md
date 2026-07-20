# Runbook

## Environment blockers (read first)

- **iOS builds**: require macOS + Xcode 16.x. Not available on this (Windows) development machine, and not virtualizable via Docker (Apple EULA prohibits macOS virtualization on non-Apple hardware). Local iOS builds/simulator runs remain blocked here, but CI iOS builds are now viable: the repo is public, so GitHub-hosted `macos-15` Actions runners are **free and unlimited** (private repos get only 2,000 min/month with a 10x multiplier on macOS, i.e. ~200 effective macOS minutes). Phase 6's Fastlane iOS lane can target `macos-15` in `.github/workflows/` for CI builds and TestFlight uploads; only local day-to-day iOS dev still needs a Mac in hand.
- **Android toolchain**: Ruby, JDK 17, and the Android SDK were not present on this machine at plan start. `TODO(user)`: confirm whether to install these natively on Windows or via a Docker image with JDK + Android SDK preinstalled (Android builds, unlike iOS, are not blocked by Apple's EULA and can run in Linux containers).
- **Supabase project**: reusing the existing `roomie` project ref `zubxuqshcyniosmdztmw` rather than creating a new one. `TODO(user)`: confirm `SUPABASE_ACCESS_TOKEN` access to this project for CI, since it's shared with the still-live `roomie` Next.js web app.
- **Live project's email-confirmation setting (Auth) is unverified**: local dev (`supabase/config.toml`) has `enable_confirmations = false`, so email+password sign-up (as of 2026-07-19, replacing the old OTP flow) gets an immediate session with no confirmation step -- matching "keep it simple" for now. The client (`features/auth/services/auth.ts`) handles either outcome correctly regardless, but if the *live* project's dashboard has confirmations turned on, users won't get a session until they click a confirmation link, which needs working email delivery (SMTP) on that project too. `TODO(user)`: check the live project's Authentication -> Providers -> Email settings (needs dashboard or `SUPABASE_ACCESS_TOKEN` access) before real users sign up against it. Turning confirmations *on* later (the "add email verification" half of this) is a dashboard/config change only -- no app code change needed.
- **Firebase / push**: `google-services.json` and `GoogleService-Info.plist` are placeholders until a Firebase project is created. `TODO(user)`: create the Firebase project and supply real config files.
- **Apple / Google Play credentials**: `APP_STORE_CONNECT_API_KEY_JSON`, `PLAY_JSON_KEY`, Fastlane Match certificates repo — none of these exist yet. `TODO(user)`: provision an Apple Developer account/App Store Connect API key, a Google Play Console service account, and a private `equilibrium-certificates` git repo for Match.
- **Android release keystore**: generated 2026-07-19 via an `eclipse-temurin:17-jdk-alpine`
  Docker container (Docker Desktop had been broken with its `docker-desktop` WSL2 distro stuck
  `Stopped`; resolved after you restarted it). `app/android/upload-keystore.jks`, PKCS12,
  alias `equilibrium-upload`, 2048-bit RSA, valid until 2053 (10000 days) -- gitignored
  (`*.jks`), never committed. `app/android/keystore.properties` (also gitignored) has the real
  store/key passwords for local release builds; the exact passwords were reported to you in
  chat when this was generated -- **back that file up somewhere durable (password manager
  file storage, encrypted backup) now**, since losing this keystore means losing the ability
  to ship updates to an already-published Play Store app, permanently, with no recovery path.
  `TODO(user)`: base64 it (`base64 -w0 app/android/upload-keystore.jks`) and add as the
  `ANDROID_KEYSTORE_BASE64` GitHub Actions secret, plus `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS` (`equilibrium-upload`), `ANDROID_KEY_PASSWORD` (same value as
  `ANDROID_KEYSTORE_PASSWORD` -- PKCS12 keystores don't support a separate key password;
  `keytool` silently ignores a different one), whenever you're ready for `release-android.yml`
  to be able to run for real.
- **Push pipeline Vault secrets**: `supabase/migrations/0008_notifications_cron.sql`'s `fn_invoke_edge_function` reads `project_url`/`service_role_key` from Supabase Vault to call the deployed edge functions from Postgres (trigger + cron); it no-ops safely until these exist. `TODO(user)`: once the project is linked and `push-dispatch`/`digest-worker`/`rotation-tick` are deployed (`supabase functions deploy`), run against the live project (dashboard SQL editor or `supabase db`, not a migration file, since these are project-specific secrets that must never be committed): `select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');` and `select vault.create_secret('<service-role-key-from-dashboard-api-settings>', 'service_role_key');`
- **`release-android.yml` / `deploy-backend.yml` secrets** (Phase 6, new): neither workflow can do anything until these exist as repo secrets (Settings -> Secrets and variables -> Actions) --
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` (production values, distinct from your local `.env`),
  `GOOGLE_SERVICES_JSON` (base64 of the real `google-services.json`, once the Firebase project exists),
  `ANDROID_KEYSTORE_BASE64` (base64 of the `.jks` above), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`,
  `PLAY_JSON_KEY` (raw JSON content, not base64 -- see the Fastfile/Appfile comments),
  `SUPABASE_ACCESS_TOKEN` (see the Supabase project bullet above).
  `deploy-backend.yml` specifically guards on `SUPABASE_ACCESS_TOKEN` being present before doing anything, so it's safe that it doesn't exist yet -- that workflow triggers on every push to `master` touching `supabase/**`, and stays a no-op until you deliberately add that secret.

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
