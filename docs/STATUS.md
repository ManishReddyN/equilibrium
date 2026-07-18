# Status

Living document tracking progress against `docs/roommate-app-execution-plan.md`. Update this
whenever a phase starts, completes, or gets blocked, so work can be picked up cold in a future
session without re-deriving state from git log + chat history.

**Working agreement:** execute phase-by-phase, stop and report at each Verification Gate rather
than pushing through phases autonomously (see `docs/DECISIONS.md`). Irreversible/live actions
(pushing migrations to the live Supabase project, dropping schema, etc.) require explicit
confirmation immediately before execution, even under a broader standing go-ahead.

## Repo / environment

- Local: `D:\personal\equilibrium`, git repo at the `equilibrium/` root.
- Remote: `https://github.com/ManishReddyN/equilibrium` (private).
- Windows 11 dev machine, no macOS/Xcode — iOS native builds/simulator/Fastlane iOS lane are
  blocked here by Apple's EULA (no macOS virtualization on non-Apple hardware). iOS phases are
  limited to writing source/config a Mac can later build. See `docs/RUNBOOK.md`.
- Supabase project: reusing the prior `roomie` project ref `zubxuqshcyniosmdztmw`
  (org Roomie-Backend) rather than provisioning new. Legacy `roomie` schema was dropped in
  migration `0000_drop_legacy_roomie_schema.sql`.

## Phase status

| Phase | Description | Status | Commit |
|---|---|---|---|
| 0 | Toolchain and repo scaffold | Done | `453c730` |
| 1 | Core dependencies and native configuration | **Not started** | — |
| 2 | Backend: Supabase schema, RLS, Prisma | Done | `ab18310` |
| 3 | App architecture: folders, navigation, data layer, household profile engine | Not started | — |
| 4 | Screens and interactions | Not started | — |
| 5 | Push notifications and background workers | Not started | — |
| 6 | CI/CD: Fastlane, Match, store delivery | Not started | — |
| 7 | Hardening, tests, docs | Not started | — |

**Note on ordering:** Phase 2 was pulled forward and completed before Phase 1, per explicit user
direction at the time. Phase 1 (native dependency install — Reanimated, NativeWind, navigation,
TanStack Query, Firebase shells, app shell composition, Phase 1 Verification Gate) is the next
phase that has not been started, and is a prerequisite for Phase 3+ (which build the app UI on
top of those dependencies).

### Phase 2 detail (complete)

- 7 migrations (`0000`-`0006`): legacy schema drop, extensions/enums, core tables,
  profile-dependent tables, functions/triggers (rotation, ledger, cohorts, equilibrium calc,
  invites, notifications), RLS policies + explicit table grants, storage/realtime config.
- pgTAP RLS suite: 26/26 assertions passing (`supabase test db`).
- Prisma introspection-mode client, pinned `6.19.3`, zero schema drift verified.
- Migrations pushed to the live linked remote project; confirmed via
  `supabase migration list` (local/remote checksums match).
- Full deviation rationale logged in `docs/DECISIONS.md`.

## Outstanding TODO(user) items

Carried from `docs/RUNBOOK.md` — blockers only the user can resolve:

- Confirm whether to install the Android toolchain (Ruby/JDK 17/Android SDK) natively on
  Windows or via a Docker image with those preinstalled.
- Arrange a macOS machine (owned, GitHub Actions `macos-15` runner, or Mac-in-the-cloud) for
  iOS builds/simulator/TestFlight — cannot happen on this Windows machine.
- Confirm `SUPABASE_ACCESS_TOKEN` CI access to the reused `zubxuqshcyniosmdztmw` project
  (shared with the still-live `roomie` Next.js web app).
- Create a Firebase project and supply real `google-services.json` /
  `GoogleService-Info.plist` (currently placeholders).
- Provision Apple Developer account / App Store Connect API key, Google Play Console service
  account, and a private `equilibrium-certificates` repo for Fastlane Match.
- Generate an Android release upload keystore and record its location outside version control.

## Next step

Start Phase 1 (core dependencies and native configuration) when given the go-ahead — see
`docs/roommate-app-execution-plan.md` lines 124-237 for the exact spec and Verification Gate.
