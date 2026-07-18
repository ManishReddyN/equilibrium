# Architecture

## Monorepo layout

```
equilibrium/
├── app/                     # React Native CLI project (bare workflow)
├── supabase/                # SQL migrations, edge functions, seed data
├── prisma/                  # Prisma schema mirroring migrations (introspection-driven)
├── fastlane-shared/         # Shared Fastlane ruby helpers
├── docs/
├── .github/workflows/
└── README.md
```

SQL migrations under `supabase/migrations/` are the source of truth for the database (Supabase-native flow). Prisma is used only in `db pull` (introspection) mode to generate a typed client for edge functions and server-side workers — Prisma does not own migrations. This avoids the classic Prisma-vs-RLS migration conflict.

## State boundary

- `zustand` — ephemeral UI state only (active tab, onboarding step, gesture flags).
- `TanStack Query` — all server state, backed by a SQLite persister for offline-first behavior.
- `react-native-mmkv` — synchronous key-value needs (session cache, feature flags).

## Household profile engine

Client-side profile gating (`ProfileGate`, `useHouseholdProfile`) is presentation-only (which UI renders). The database (RLS + `security definer` trigger functions from Phase 2) is the actual enforcement layer for what's allowed per household profile (duo / shared_flat / co_living). Invariant: **client gating is UX, DB gating is security.**

## Design tokens

- `warn` (amber) is reserved exclusively for the out-of-equilibrium household state (Phase 4 ledger). Never used decoratively.
- Icons exclusively from `lucide-react-native`, default `size={20}`, `strokeWidth={1.75}`, color from theme tokens.
- Shadows: one shared `Card` primitive owns the iOS/Android shadow treatment.

## Environment constraints (see docs/DECISIONS.md for full rationale)

- Development machine is Windows. iOS builds require a macOS machine with Xcode — not available here, not emulable via Docker (Apple EULA + no Linux/Windows Xcode). iOS phases are executed as source/config only.
- Android/Fastlane require Ruby + JDK + Android SDK, not present at plan start; installation path (native vs. Docker) to be decided at Phase 1/6.
