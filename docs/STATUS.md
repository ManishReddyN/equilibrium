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
| 3 | App architecture: folders, navigation, data layer, household profile engine | Done | `db7f224` |
| 4 | Screens and interactions | Done | `f4365d1` |
| 5 | Push notifications and background workers | Done (CI-verified); live secrets/on-device test pending your input | `2e1a2f2` |
| 6 | CI/CD: Fastlane, Match, store delivery (Android track) | Android track mostly built; keystore generation blocked (Docker/WSL2), everything else pending your secrets | pending |
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

### Phase 3 detail (complete)

- **Folder structure** per plan section 3.1: `app/` (shell, providers, navigation),
  `features/<name>/{components,services}` for `auth`, `onboarding`, `dashboard`, `rotation`,
  `ledger`, `market`, `feedback`, `household`, `notifications`, plus cross-cutting `shared/`
  (components, hooks, utils), `lib/` (Supabase client, SQLite persister, query keys, env, DB
  types), and `theme/` (design tokens, icons). `household` was added beyond the plan's literal
  folder list (needed a home for the sign-out control and household-settings screen); see
  `docs/DECISIONS.md`.
- **Navigation** (`app/src/app/navigation/`): typed `RootStackParamList`
  (`Loading | Auth | Onboarding | Main`) and `MainTabParamList`, deep-link config
  (`linking.ts`), a bottom-tab `MainTabs` (Home/Rotation/Ledger/Household always present;
  Market/Feedback conditional on household profile — `shared_flat`/`duo` respectively) with
  stable hoisted icon components, and `RootNavigator` implementing the AuthGate: `Loading` →
  `Auth` (sign-in, OTP) → `Onboarding` (no household yet, or `onboardingStore.isInProgress`) →
  `Main`. `RealtimeChannelManager` (one Supabase realtime channel per household) is started/
  stopped from a `useEffect` keyed on the resolved household id.
- **Offline-first data layer**: `QueryProvider` wraps `PersistQueryClientProvider` around a
  `QueryClient` (30s `staleTime`, 7-day `gcTime`) and `sqliteQueryPersister`
  (`lib/db/sqlite.ts`), a hand-rolled TanStack Query persister backed by
  `react-native-quick-sqlite` (single-row upsert/select/delete keyed by a constant, `buster`
  tied to `appVersion` so schema changes auto-invalidate the cache). `lib/queryKeys.ts`
  centralizes every query key factory used across features.
- **Household profile engine** (`shared/hooks/useHouseholdProfile.ts`): derives
  `duo` (2 members) / `shared_flat` (3-5) / `co_living` (6+, with `cohortIndex` for sub-grouping,
  defaulting to 0 when unset) from household member count — drives the conditional Market/
  Feedback tabs and other profile-gated UI (`ProfileGate`).
  `SessionProvider` (Supabase auth session + `onAuthStateChange`, MMKV-backed storage adapter)
  composes the whole stack in the new `app/src/app/App.tsx`, replacing Phase 1's `ProbeScreen`.
- **Feature screens/services** (functional, not yet polished per Phase 4's interaction spec):
  sign-in (OTP), full onboarding flow (welcome → create-or-join → household basics → chore
  setup → definition-of-done → invite share / join-by-code), dashboard, rotation, ledger,
  market, feedback, household settings — each with a services layer wrapping the relevant
  Supabase queries/RPCs from Phase 2's schema.
- **ESLint feature isolation**: dynamically-generated per-feature `no-restricted-imports`
  overrides in `app/.eslintrc.js` banning the `@features/<other>/*` alias from within any
  other feature's files (real violation caught and fixed during this phase — see
  `docs/DECISIONS.md`). Also added `no-void` tuning (`allowAsStatement: true`) to resolve a
  conflict with `@typescript-eslint/no-floating-promises`'s required `void` markers.
  `HomeTabIcon`-style stable component hoisting fixed `react/no-unstable-nested-components`
  in `MainTabs.tsx` for real, rather than suppressing it.
- **Tests**: Jest unit tests added for the SQLite persister round-trip (against a new
  stateful fake `react-native-quick-sqlite` mock), `queryKeys` uniqueness, and the household
  profile engine's boundary behavior (2/3/5/6/20-member households, cohortIndex default).
  `App.test.tsx` updated to render the real provider stack + `RootNavigator` instead of the
  deleted `ProbeScreen`; needed a `@react-native-clipboard/clipboard` mock since the render
  tree now reaches `InviteShareScreen`.
- **Verification**: `tsc --noEmit` clean, `npx eslint .` 0 errors/0 warnings, `jest` 4 suites /
  17 tests passing, `npm run lint` (eslint + no-emoji check) clean. Several gap-fill decisions
  (OTP auth choice, `Loading` route, `p_proof_path` placeholder, baseline photo capture
  deferred to Phase 4, market-claim/feedback-retract RPC gaps, the TS same-basename `.d.ts`
  exclusion gotcha, the lucide-react-native unexported-types workaround, the missing
  `@types/jest` convention) are logged in `docs/DECISIONS.md`.
- iOS/Android on-device verification remains blocked locally per the existing environment
  constraints (see Phase 1 note); CI (`tsc`/`lint`/`jest`/Android debug build) is the
  verification path until a device is available.

### Phase 4 detail (complete)

- **Dashboard**: `SwipeToComplete` (Reanimated pan gesture + `swipeThresholds.ts` math) and a
  Skia particle-based `CompletionCelebration`, `DailyProgressHeader`.
- **Rotation**: `RotationCarousel` (Reanimated pan + `carouselMath.ts` snap/scale/opacity),
  `CycleCard`, `HandlerChip`, and a `hasMakeupObligationForChore` parity helper
  (`shared/utils/rotation.ts`) for the makeup badge on both the current and projected cycles.
- **Ledger**: `BilateralBalanceSlider` (duo) and `StackedContributionBar` (shared_flat/
  co_living, cohort-grouped), both driven by `balanceMath.ts`, plus a smooth
  `equilibriumProgress` color-ramp helper in `shared/utils/points.ts`.
- **Onboarding**: baseline photo capture on `DefinitionOfDoneScreen` via
  `react-native-image-picker`'s `launchCamera`, uploaded immediately on capture (not gated on
  "Next"), Camera permission wired on both platforms.
- **Market**: `ListingComposerSheet` (hand-rolled bottom sheet — no such library/pattern
  existed anywhere in the codebase) plus `fn_claim_listing`
  (`supabase/migrations/0007_market_claim.sql`) wired into `MarketScreen`'s claim flow.
- **Feedback**: `fn_retract_feedback` wired into `FeedbackScreen`'s retract flow.
- **Verification**: `tsc` clean, `eslint` 0 errors/warnings, `jest` 11 suites/118 tests
  passing, pgTAP 37/37 (up from 26) against the local Supabase stack. Gap-fill decisions
  (bounty stepper increment, ledger `entry_type` rules, cohort ideal share, photo upload
  timing, etc.) logged in `docs/DECISIONS.md`.

### Phase 5 detail (built; live secrets + on-device verification pending your input)

- **DB plumbing** (`supabase/migrations/0008_notifications_cron.sql`): `pg_net` + `pg_cron` +
  `supabase_vault` extensions; a `notification_outbox` row trigger dispatches immediate-mode
  notifications to the new `push-dispatch` edge function, and `pg_cron` schedules
  `digest-worker` hourly and a new `fn_rotation_tick` (catch-up pass for shared_flat/co_living
  chore skips, which don't auto-create a follow-up cycle the way completions/duo-makeup
  already do) nightly, all invoked via `fn_invoke_edge_function` reading the project URL/
  service-role key from Supabase Vault rather than a hardcoded secret. This function and
  `fn_rotation_tick` are the first in this codebase with `revoke execute ... from public,
  anon, authenticated` — they have no per-caller authorization, unlike every other RPC.
- **Edge functions** (`supabase/functions/`): `push-dispatch` (FCM HTTP v1, OAuth2
  service-account flow via `npm:jose`), `digest-worker` (aggregates undispatched digest-mode
  outbox rows per recipient into one push — summarizes actual outbox categories, not the
  plan's illustrative "completed/due tomorrow" text, since nothing populates those), and
  `rotation-tick` (thin wrapper around `fn_rotation_tick`). All zod-validate/log
  structured JSON/return AIP-193-style errors per the plan.
- **Client** (`features/notifications/services/push.ts` + `notificationLinking.ts`):
  `PushNotificationManager` (permission request, Android 13+ `POST_NOTIFICATIONS`, FCM token
  obtain/upsert/refresh, two Notifee channels `chores`/`digest`, foreground message display)
  started/stopped from `RootNavigator` keyed on the signed-in user id (a push token belongs to
  the account, not the household) — same pattern as `RealtimeChannelManager`. Notification-tap
  deep links route by category to the Home or Market tab (no per-item detail screen exists in
  this app to route an id into, so the FCM `data` payload carries `{category, outboxId}`
  rather than the plan's literal `{route, id}` shape) via a standalone `navigationRef`.
- **Verification**: `tsc` clean, `eslint` 0 errors/warnings, `jest` 11 suites/118 tests passing
  (added Firebase Messaging/Notifee mocks to `jest.setup.js`). Docker Desktop wasn't responsive
  on this machine when this phase landed, so migration/pgTAP verification relied on CI instead
  of the local Supabase stack — **confirmed green** at commit `2e1a2f2` (`backend` job, 2m21s:
  `supabase start` applied `0008_notifications_cron.sql` cleanly, pgTAP suite still passing).
- **Not done, needs your input** (see "Outstanding items" below): the real Firebase project
  (still the Phase 1 placeholder `google-services.json`), the `FCM_SERVICE_ACCOUNT` secret,
  and the Vault `project_url`/`service_role_key` secrets on the live project — all of which
  block only the *live* push-delivery path, not the code itself. On-device delivery testing
  (plan's Verification Gate 5.3) is also blocked, same as all along, by having no physical
  device/emulator on this machine.

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
- **CI speed** (2026-07-19, per your request to cut CI time down): the Android debug build
  step was the ~19min run's critical path (~17.5min of it) with no Gradle caching and native
  modules compiled across all four `reactNativeArchitectures` ABIs for a build that only
  proves compilability. Added `gradle/actions/setup-gradle@v4` (Gradle Home caching) and
  restricted CI's `assembleDebug` to `-PreactNativeArchitectures=x86_64`; enabled
  `org.gradle.parallel`/`org.gradle.caching`. Stayed on free-tier `ubuntu-latest`/`macos-15`
  standard runners throughout, per your instruction — no paid/larger runner, no billing
  change. First (cold-cache) run after the fix: **9m29s**, down from ~19min.
- **Pre-existing CI bug found and fixed while verifying the above**: CI's actual `CI` workflow
  (distinct from the unrelated `Dependabot Updates` workflow, whose own failures on dependency
  PRs had been masking this) had been failing silently since the Phase 3 push (`a4be598`) — no
  `.env` exists in CI, so anything importing `lib/supabase.ts` hit `lib/env.ts`'s zod parse of
  `undefined` `SUPABASE_URL`/`SUPABASE_ANON_KEY`. Fixed with a placeholder-`.env` CI step, same
  pattern as the existing placeholder Firebase config. Full detail in `docs/DECISIONS.md`.
- **Android track built** (2026-07-19): `app/Gemfile` now includes `fastlane`;
  `app/android/fastlane/{Appfile,Fastfile}` implement the `bump`/`beta` lanes from plan section
  6.3 verbatim. `android/app/build.gradle`'s `release` `signingConfig` now reads a gitignored
  `android/keystore.properties` for local builds (template: `keystore.properties.example`) —
  CI/Fastlane instead injects the keystore path/passwords as Gradle project properties, the
  standard mechanism for never committing the keystore itself. `enableProguardInReleaseBuilds`
  flipped to `true` with defensive keep rules for RN/Firebase/Reanimated/etc. in
  `proguard-rules.pro`. Added `.github/workflows/release-android.yml` (tag `v*` → `bundle exec
  fastlane android beta`) and `deploy-backend.yml` (push to `master` touching `supabase/**` →
  `supabase db push --linked` + `functions deploy`, guarded on `SUPABASE_ACCESS_TOKEN`
  actually being present so it stays inert rather than red-failing every backend push until
  you provision that secret — **this is the one workflow that can push schema to the live,
  shared-with-`roomie` Supabase project**, flagging it explicitly here).
- **Blocked**: keystore generation needs a JDK; this machine has none locally, and the Docker
  route broke mid-session — `wsl -l -v` shows the `docker-desktop` WSL2 distro stuck `Stopped`
  even after killing and relaunching Docker Desktop.exe, so `docker info` just hangs rather
  than the engine ever coming up. Looks like a WSL2/virtualization issue on this machine, not
  something a retry fixes — see `docs/RUNBOOK.md`'s Android release keystore entry for what to
  try. Nothing else in Phase 6 depends on this; nothing has been fabricated in its place.
- **Not verified**: no release build (signed or otherwise) has actually been run anywhere yet
  — `release-android.yml` is tag-triggered and needs secrets that don't exist (see
  `docs/RUNBOOK.md`), and this machine can't run one locally without the JDK above. The plan's
  own Verification Gate ("release build boots" on a device) is blocked the same way every
  on-device gate has been all along.

## Outstanding items needing your input

- **Firebase**: you're creating the project via CLI — run `firebase login` in your own
  terminal (same pattern as `supabase login`) whenever you're ready; I'll take it from there
  to register the Android app and pull `google-services.json` + an FCM service-account JSON
  (`FCM_SERVICE_ACCOUNT`, needed by `push-dispatch`/`digest-worker` now that Phase 5 is built).
- **Supabase Vault secrets** (new, Phase 5): once the project is linked and
  `push-dispatch`/`digest-worker`/`rotation-tick` are deployed (`supabase functions deploy`),
  run against the live project (dashboard SQL editor, not a migration file — see
  `docs/RUNBOOK.md`): `select vault.create_secret('https://<ref>.supabase.co', 'project_url');`
  and the same for `service_role_key` (from the dashboard's API settings). Without these,
  `fn_invoke_edge_function` no-ops safely rather than erroring, so this isn't blocking anything
  else — just the live push-delivery path.
- **Android release keystore — blocked, needs a decision**: I planned to auto-generate this via
  a Docker JDK container (you'd asked for that), but Docker Desktop broke mid-session: `wsl -l
  -v` shows its `docker-desktop` WSL2 distro stuck `Stopped` even after I killed and relaunched
  Docker Desktop.exe, so `docker info` hangs indefinitely rather than the engine coming up.
  This looks like a WSL2/virtualization config issue on this machine, not something fixable by
  retrying. Options: (1) you fix Docker Desktop (restart the machine, `wsl --update`, or
  reinstall) and I'll generate the keystore once it's back; (2) you generate it yourself with
  `keytool` (command in `docs/RUNBOOK.md`) if you have a JDK some other way; (3) tell me another
  approach you'd prefer. Nothing else in Phase 6 depends on this.
- **New CI secrets from Phase 5/6** (see `docs/RUNBOOK.md` for the full list and exact names):
  `FCM_SERVICE_ACCOUNT` and two Supabase Vault secrets (Phase 5, push delivery), plus
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` (production), `GOOGLE_SERVICES_JSON`,
  `ANDROID_KEYSTORE_BASE64`/`_PASSWORD`/`ANDROID_KEY_ALIAS`/`_PASSWORD`, `PLAY_JSON_KEY`, and
  `SUPABASE_ACCESS_TOKEN` (Phase 6, `release-android.yml`/`deploy-backend.yml`). None of these
  block further code work — the workflows that need them are either tag-triggered or
  explicitly guarded to stay inert until you add them.
- **Google Play Console developer account**: needed only at actual submission time (not
  blocking Phases 1/3/4/5/6-Android-track). One-time $25 fee + Google identity verification —
  only you can do this. Let me know once it exists so I can wire up the Play service-account
  JSON (`PLAY_JSON_KEY`).
- **Store listing content** (privacy policy URL, app icon/feature graphic/screenshots,
  descriptions): not blocking near-term work. I can draft the privacy policy text and
  descriptions, and can host the privacy policy via GitHub Pages on this same repo if that
  works for you.
- Apple/App Store items (Developer account, Match certs repo) are **not** being pursued right
  now per your Play-Store-first framing.

## Next step

Phase 6's Android track is built except the keystore (blocked, see above — genuinely needs
your input, not just more waiting). Continuing into Phase 7 (hardening, tests, docs) next per
the working agreement, since it doesn't depend on the keystore either — see
`docs/roommate-app-execution-plan.md` section 7. Play Store upload itself stays blocked on the
Play Console account above regardless.
