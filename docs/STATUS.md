# Status

Living document tracking progress against `docs/roommate-app-execution-plan.md`. Update this
whenever a phase starts, completes, or gets blocked, so work can be picked up cold in a future
session without re-deriving state from git log + chat history.

**Working agreement (updated 2026-07-18):** executing Phases 1, 3, 4, 5, and the Android track
of 6/7 continuously, without stopping at each Verification Gate, per explicit user direction
("keep going until the app is functional... don't wait between phases"). This supersedes the
earlier phase-by-phase check-in preference for this stretch of work. Irreversible/live actions
(pushing migrations to the live Supabase project, paying for/creating external accounts, etc.)
still get flagged rather than done silently. iOS/App Store work stays out of scope near-term —
the goal is Play Store submission, and this machine can't build/verify iOS regardless.

## Repo / environment

- Local: `D:\personal\equilibrium`, git repo at the `equilibrium/` root.
- Remote: `https://github.com/ManishReddyN/equilibrium` (**public** — flipped from private on
  2026-07-18 to get unlimited free GitHub Actions minutes on all runner types, notably `macos-15`
  and standard `ubuntu-latest`, both heavily rate-limited or absent on the private free tier; see
  `docs/DECISIONS.md`). Verified no secrets are committed before flipping visibility.
- Windows 11 dev machine: no macOS/Xcode (iOS builds blocked by Apple's EULA), and no local
  JDK/Android SDK/Ruby either. Rather than provisioning local native tooling, Android build
  verification runs in CI (`.github/workflows/ci.yml`) on `ubuntu-latest`, which ships the
  Android SDK preinstalled — free and unlimited since the repo is public.
- Supabase project: reusing the prior `roomie` project ref `zubxuqshcyniosmdztmw`
  (org Roomie-Backend). Legacy `roomie` schema was dropped in migration
  `0000_drop_legacy_roomie_schema.sql`.

## Phase status

| Phase | Description | Status | Commit |
|---|---|---|---|
| 0 | Toolchain and repo scaffold | Done | `453c730` |
| 1 | Core dependencies and native configuration | Done | `5290caf` |
| 2 | Backend: Supabase schema, RLS, Prisma | Done | `ab18310` |
| 3 | App architecture: folders, navigation, data layer, household profile engine | In progress | — |
| 4 | Screens and interactions | Not started | — |
| 5 | Push notifications and background workers | Not started | — |
| 6 | CI/CD: Fastlane, Match, store delivery (Android track) | Started (minimal CI only) | — |
| 7 | Hardening, tests, docs | Not started | — |

### Phase 1 detail (complete)

- Installed all Phase 1 native deps (Reanimated, Gesture Handler, Screens, Safe Area Context,
  React Navigation, NativeWind + Tailwind, Skia, TanStack Query + persister, quick-sqlite,
  Supabase JS, Firebase messaging, Notifee, lucide icons, MMKV, zustand, zod, clipboard) with
  exact pinned versions (`--save-exact`). One version substitution logged in
  `docs/DECISIONS.md` (`query-sync-storage-persister` 5.62.11 doesn't exist; used 5.62.12).
- Babel: `nativewind/babel` preset added, `react-native-reanimated/plugin` last. Metro wrapped
  with `withNativeWind`. `tailwind.config.js` has the exact design tokens from the plan.
- Nunito fonts (Regular/Medium/SemiBold/Bold) pulled from Google Fonts' CSS2 API (the
  google/fonts source repo only ships a variable font now) and re-tagged with `fonttools` so
  each weight is a distinct font family cross-platform — see `docs/DECISIONS.md`.
- Firebase: gradle classpath/plugin wired in; `google-services.json` /
  `GoogleService-Info.plist` are gitignored placeholders (real ones land in Phase 5).
- App shell composed at `app/src/app/App.tsx` (`GestureHandlerRootView` →
  `SafeAreaProvider` → `PersistQueryClientProvider` → `NavigationContainer`) with a temporary
  `ProbeScreen` proving NativeWind, Nunito, Reanimated, Skia, and quick-sqlite all render/run.
  Deleted in Phase 4 per the plan. `index.js` and `__tests__/App.test.tsx` updated to match.
- Verification: `tsc --noEmit` clean, `npm run lint` 0 errors (2 acceptable inline-style
  warnings on the throwaway probe screen), `jest` passing (needed gesture-handler jestSetup,
  a `react-native-reanimated/mock` moduleNameMapper, manual mocks for mmkv/quick-sqlite/Skia,
  and a widened `transformIgnorePatterns` for `@react-navigation`'s ESM build — all standard
  RN testing gotchas, not app bugs).
- iOS `pod install` / `run-ios` / `run-android` device verification remain blocked locally per
  the existing environment constraints; Android build verification now happens in CI instead
  (see Phase 6 note below).

### Phase 6 detail (started early, minimal slice)

- Added `.github/workflows/ci.yml` ahead of schedule (normally Phase 6) instead of building a
  local Docker Android SDK/JDK toolchain — see `docs/DECISIONS.md` for rationale. Two jobs:
  `app` (tsc, lint, jest, Android debug build via `gradlew assembleDebug` on `ubuntu-latest`)
  and `backend` (`supabase start` + `supabase test db` + Prisma validate/drift check).
  `app/android/gradlew`'s executable bit was fixed in git (was `100644`, needed `100755`).
  Fastlane lanes, release signing, and Play Store upload steps are still to come.
- **CI verified green end-to-end** at commit `02d317e` (both `app` and `backend` jobs passing,
  including the real Android debug build on `ubuntu-latest`). First run (`5290caf`) failed on
  two issues, both fixed same-day: an ESLint config gap for the `jest` global in
  `jest.setup.js`, and a false-positive Prisma drift failure caused by CI's `npm install -g
  supabase` grabbing latest (newer GoTrue auth image, extra schema column) instead of the
  locally-pinned `2.108.0` — CI now pins the same version. Full detail in `docs/DECISIONS.md`.

## Outstanding items needing your input

- **Firebase**: you're creating the project via CLI — run `firebase login` in your own
  terminal (same pattern as `supabase login`) whenever you're ready; I'll take it from there
  to register the Android app and pull `google-services.json` + an FCM service-account JSON.
- **Android release keystore**: you asked me to auto-generate it (Phase 6) — will do via a
  Docker JDK container, then hand you the `.jks` file + passwords to store safely (never
  committed; see `.gitignore`).
- **Google Play Console developer account**: needed only at actual submission time (not
  blocking Phases 1/3/4/5). One-time $25 fee + Google identity verification — only you can do
  this. Let me know once it exists so I can wire up the Play service-account JSON (`PLAY_JSON_KEY`).
- **Store listing content** (privacy policy URL, app icon/feature graphic/screenshots,
  descriptions): not blocking near-term work. I can draft the privacy policy text and
  descriptions, and can host the privacy policy via GitHub Pages on this same repo if that
  works for you — screenshots need a running build, so those come once Phase 4 has real
  screens.
- Apple/App Store items (Developer account, Match certs repo) are **not** being pursued right
  now per your Play-Store-first framing.

## Next step

Phase 3 (app architecture: folder hierarchy, navigation, Supabase client, offline-first data
layer, household profile engine) is starting now — see
`docs/roommate-app-execution-plan.md` lines 513-594.
