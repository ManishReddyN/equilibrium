# Household Chore Platform — Full Execution Plan for Claude Code

**Project codename:** `equilibrium`
**Deliverable:** Native iOS + Android app (React Native CLI Bare Workflow) + Supabase/PostgreSQL backend + Fastlane CI/CD.
**This document is the single source of truth.** Execute phases strictly in order. Do not skip verification gates.

---

## 0. Execution Protocol (read first)

1. Work phase by phase. Each phase ends with a **Verification Gate** — a list of commands that must pass before moving on. If a gate fails, fix before proceeding.
2. Commit at the end of every phase with the message format `phase(N): <summary>`. Use a single git repo, monorepo layout (see 0.1).
3. Never introduce emojis anywhere: no source strings, no comments, no commit messages, no logs, no UI copy. This is a hard constraint from the design spec.
4. Pin every dependency to an exact version in `package.json` (no `^` or `~`). Versions listed below are the targets; if a listed version is incompatible at install time, resolve to the nearest compatible version and record the change in `docs/DECISIONS.md`.
5. All new files must be TypeScript (`.ts`/`.tsx`). `strict: true` is non-negotiable.
6. Any deviation from this plan gets logged in `docs/DECISIONS.md` with rationale, one line per decision.

### 0.1 Monorepo layout (top level)

```
equilibrium/
├── app/                     # React Native CLI project (bare workflow)
├── supabase/                # SQL migrations, edge functions, seed data
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
├── prisma/                  # Prisma schema mirroring migrations (introspection-driven)
│   └── schema.prisma
├── fastlane-shared/         # Shared Fastlane ruby helpers
├── docs/
│   ├── DECISIONS.md
│   ├── ARCHITECTURE.md
│   └── RUNBOOK.md
├── .github/workflows/       # CI entry points that invoke Fastlane
└── README.md
```

Rationale: SQL migrations are the source of truth for the DB (Supabase-native flow); Prisma is used in `db pull` (introspection) mode to generate a typed client for edge functions and any server-side workers — Prisma does NOT own migrations here. This avoids the classic Prisma-vs-RLS migration conflict. Record this in `docs/ARCHITECTURE.md`.

---

## Phase 0 — Toolchain and Repo Scaffold

### 0.2 Prerequisites to verify on the machine

```bash
node --version        # require >= 20 LTS
ruby --version        # require >= 3.1 (for Fastlane/CocoaPods)
pod --version         # CocoaPods >= 1.15
java --version        # JDK 17 (Android Gradle Plugin 8.x requirement)
xcodebuild -version   # Xcode 16.x
supabase --version    # Supabase CLI >= 1.200
```

If any is missing, halt and report to the user rather than installing system-level toolchains silently.

### 0.3 Scaffold the RN project

```bash
npx @react-native-community/cli@latest init EquilibriumApp --version 0.76.5 --directory app --pm npm
```

- RN 0.76.x — New Architecture enabled by default; keep it enabled (Reanimated 3.16+, Gesture Handler 2.20+, Skia 1.5+ all support Fabric).
- Rename display name to "Equilibrium" in `app.json`, `Info.plist` (`CFBundleDisplayName`), and `strings.xml`.
- Bundle IDs: `com.equilibrium.app` (both platforms). Set in Xcode project and `android/app/build.gradle` (`applicationId`).

### 0.4 TypeScript strict config + path aliases

Replace `app/tsconfig.json`:

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@app/*": ["src/app/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@lib/*": ["src/lib/*"],
      "@theme/*": ["src/theme/*"]
    }
  },
  "include": ["src", "index.js", "*.config.js"]
}
```

Configure Babel to resolve the same aliases in `app/babel.config.js` via `babel-plugin-module-resolver` (install as devDependency). **Order matters:** `react-native-reanimated/plugin` must remain the LAST plugin in the array (added in Phase 1).

### 0.5 Lint/format baseline

- ESLint: extend `@react-native` config, add `@typescript-eslint/recommended-type-checked`.
- Prettier: `printWidth: 100`, `singleQuote: true`, `trailingComma: "all"`.
- Add a custom ESLint rule guard against emojis: add `no-restricted-syntax` with a regex-based rule via `eslint-plugin-regexp` or simpler — a repo script `scripts/check-no-emoji.sh` that greps `src/` for the emoji unicode ranges and fails CI:

```bash
#!/usr/bin/env bash
if grep -rPn "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" app/src supabase docs; then
  echo "Emoji detected. Spec forbids emojis anywhere."; exit 1
fi
exit 0
```

Wire this into `npm run lint` and the CI pipeline.

### 0.6 Verification Gate — Phase 0

```bash
cd app && npx tsc --noEmit
npm run lint
npx react-native run-ios --simulator "iPhone 16"   # app boots to default screen
npx react-native run-android                        # app boots on emulator
```

Commit: `phase(0): scaffold RN 0.76 bare workflow, strict TS, aliases, lint gates`

---

## Phase 1 — Core Dependencies and Native Configuration

### 1.1 Install order (exact — some packages patch native builds)

```bash
cd app
npm i react-native-reanimated@3.16.7 react-native-gesture-handler@2.22.0 \
      react-native-screens@4.5.0 react-native-safe-area-context@5.1.0 \
      @react-navigation/native@7.0.14 @react-navigation/native-stack@7.2.0 \
      @react-navigation/bottom-tabs@7.2.0 \
      nativewind@4.1.23 tailwindcss@3.4.17 \
      @shopify/react-native-skia@1.5.10 \
      @tanstack/react-query@5.62.11 @tanstack/query-sync-storage-persister@5.62.11 \
      @tanstack/react-query-persist-client@5.62.11 \
      react-native-quick-sqlite@8.2.7 \
      @supabase/supabase-js@2.47.10 \
      react-native-url-polyfill@2.0.0 react-native-get-random-values@1.11.0 \
      @react-native-firebase/app@21.6.1 @react-native-firebase/messaging@21.6.1 \
      @notifee/react-native@9.1.8 \
      lucide-react-native@0.469.0 react-native-svg@15.10.1 \
      react-native-mmkv@3.2.0 zustand@5.0.2 zod@3.24.1 \
      @react-native-clipboard/clipboard@1.15.0
npm i -D babel-plugin-module-resolver@5.0.2 prettier@3.4.2
cd ios && pod install
```

Notes for the executor:
- `zustand` is used ONLY for ephemeral UI state (active tab, onboarding step, gesture flags). All server state goes through TanStack Query. Document this boundary in `docs/ARCHITECTURE.md`.
- `react-native-mmkv` backs synchronous key-value needs (session cache, feature flags). SQLite backs the TanStack Query persister.
- `@notifee/react-native` handles local notification display/channels; FCM/APNs handle delivery.

### 1.2 Babel and Metro

`babel.config.js` final plugin order:
```js
plugins: [
  ["module-resolver", { root: ["./"], alias: { "@app": "./src/app", "@features": "./src/features", "@shared": "./src/shared", "@lib": "./src/lib", "@theme": "./src/theme" } }],
  "react-native-reanimated/plugin" // MUST be last
]
```
Preset for NativeWind v4: add `nativewind/babel` to presets per NativeWind v4 docs, and wrap Metro config with `withNativeWind` from `nativewind/metro`, pointing at `global.css`.

### 1.3 NativeWind v4 + design tokens

`app/tailwind.config.js`:

```js
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#F8FAFC",        // slate-50 base
        primary: "#0D9488",       // teal-600 sage
        "primary-soft": "#CCFBF1",
        border: "#E2E8F0",        // slate-200
        warn: "#D97706",          // amber-600 — ONLY for out-of-equilibrium states
        ink: "#0F172A",
        "ink-muted": "#64748B"
      },
      fontFamily: {
        sans: ["Nunito-Regular"],
        "sans-medium": ["Nunito-Medium"],
        "sans-semibold": ["Nunito-SemiBold"],
        "sans-bold": ["Nunito-Bold"]
      },
      borderRadius: { card: "16px", control: "12px" }
    }
  }
};
```

Design rules to enforce in every component (write into `docs/ARCHITECTURE.md` and follow):
- `warn` amber appears ONLY when household equilibrium is out of tolerance (defined Phase 4). Never for decoration.
- Icons exclusively from `lucide-react-native`, default `size={20}`, `strokeWidth={1.75}`, color from tokens.
- Shadows: iOS subtle (`shadowOpacity 0.06, radius 12`), Android `elevation 2`. One shared `Card` primitive owns this.

### 1.4 Fonts via native asset linking

- Download Nunito (Regular/Medium/SemiBold/Bold) TTFs into `app/src/assets/fonts/`.
- Create `app/react-native.config.js`:

```js
module.exports = { assets: ["./src/assets/fonts"] };
```

- Run `npx react-native-asset`. Verify fonts land in `Info.plist` (`UIAppFonts`) and `android/app/src/main/assets/fonts/`.

### 1.5 Firebase / push native setup (config only in this phase; logic in Phase 6)

- Android: place `google-services.json` placeholder path `android/app/google-services.json`; add `com.google.gms:google-services:4.4.2` classpath and apply plugin in `app/build.gradle`. If the real file is unavailable, generate the project structure and add a `TODO(user)` line in `docs/RUNBOOK.md` — do not fabricate keys.
- iOS: add `GoogleService-Info.plist` placeholder reference; enable Push Notifications + Background Modes (remote notifications) capabilities in the Xcode project via `project.pbxproj` edits or `xcodeproj` gem in Fastlane setup phase. Add `aps-environment` entitlement.
- iOS uses native APNs transport through Firebase Messaging (`FirebaseAppDelegateProxyEnabled` left true for simplicity; document in DECISIONS.md).

### 1.6 App shell wiring

`app/src/app/App.tsx` composition order (outermost first):
`GestureHandlerRootView` → `SafeAreaProvider` → `QueryClientProvider` + `PersistQueryClientProvider` → `NavigationContainer` → `RootNavigator`.

Import `react-native-gesture-handler` at the very top of `index.js`.

### 1.7 Verification Gate — Phase 1

```bash
npx tsc --noEmit
npx react-native run-ios     # renders a styled probe screen: canvas bg, Nunito text, teal button, lucide icon
npx react-native run-android
```
Add a temporary `ProbeScreen` proving: NativeWind classes render, Nunito loads, Reanimated `useSharedValue` animates a box, Skia draws a circle, quick-sqlite opens a DB and executes `SELECT 1`. Delete the probe in Phase 4.

Commit: `phase(1): native deps, NativeWind tokens, fonts, firebase shells, app shell`

---

## Phase 2 — Backend: Supabase Project, SQL Migrations, RLS, Prisma

### 2.1 Project init

```bash
supabase init            # at repo root
supabase start           # local stack for development
```

All schema changes are SQL migration files under `supabase/migrations/`, named `NNNN_description.sql`. Never edit an applied migration; always add a new one.

### 2.2 Migration 0001 — extensions and enums

```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create type assignment_status as enum ('pending','in_progress','completed','skipped','disputed');
create type ledger_entry_type as enum (
  'chore_completed','turn_debit','turn_credit','market_swap','market_bounty',
  'market_sublet','dispute_adjustment','onboarding_baseline'
);
create type household_profile as enum ('duo','shared_flat','co_living');
create type feedback_status as enum ('queued','released','read','retracted');
```

### 2.3 Migration 0002 — core tables

Implement exactly the five spec tables, hardened. Every table gets `created_at timestamptz not null default now()`; mutable tables get `updated_at` with a shared trigger.

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  roommate_count int not null check (roommate_count between 2 and 20),
  profile household_profile not null generated always as (
    case when roommate_count = 2 then 'duo'::household_profile
         when roommate_count between 3 and 5 then 'shared_flat'::household_profile
         else 'co_living'::household_profile end
  ) stored,
  cool_off_minutes int not null default 240 check (cool_off_minutes between 0 and 4320),
  equilibrium_tolerance int not null default 15 check (equilibrium_tolerance between 5 and 50),
  invite_code_hash text,                      -- sha256 of the invite secret; raw secret never stored
  invite_expires_at timestamptz,
  digest_hour_local int not null default 18 check (digest_hour_local between 0 and 23),
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  full_name varchar(80) not null,
  avatar_path text,
  push_token_ios varchar(512),
  push_token_android varchar(512),
  cohort_index int,                           -- co-living cohort assignment; null otherwise
  points_balance int not null default 0,      -- denormalized; maintained by ledger trigger
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_household on profiles(household_id);

create table chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title varchar(120) not null,
  definition_of_done text not null default '',
  baseline_photo_path text,                    -- storage path; immutable after onboarding (enforced by trigger)
  complexity_weight int not null default 1 check (complexity_weight between 1 and 10),
  is_recurring boolean not null default true,
  recurrence_days int check (recurrence_days between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_chores_household on chores(household_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,  -- denormalized for cheap RLS
  current_handler_id uuid not null references profiles(id),
  status assignment_status not null default 'pending',
  rotation_cycle int not null default 1,
  is_debit_makeup boolean not null default false,   -- true when created by turn_debit enforcement
  target_completion_date timestamptz not null,
  completed_at timestamptz,
  proof_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_assignments_handler_status on assignments(current_handler_id, status);
create index idx_assignments_household_date on assignments(household_id, target_completion_date);

create table audit_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(id),
  assignment_id uuid references assignments(id),
  points_delta int not null,
  entry_type ledger_entry_type not null,
  metadata jsonb not null default '{}',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_ledger_household_created on audit_ledger(household_id, created_at desc);
create index idx_ledger_user on audit_ledger(user_id);
```

Ledger is append-only: revoke UPDATE/DELETE from all client roles (see RLS) and add a trigger raising an exception on UPDATE/DELETE for defense in depth.

### 2.4 Migration 0003 — profile-dependent tables

```sql
-- Duo: asynchronous cool-off feedback queue
create table feedback_queue (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  body text not null check (char_length(body) <= 1000),
  status feedback_status not null default 'queued',
  release_at timestamptz not null,           -- now() + household.cool_off_minutes, set by trigger
  created_at timestamptz not null default now()
);

-- Shared flat: chore market
create table market_listings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  lister_id uuid not null references profiles(id),
  listing_type varchar(10) not null check (listing_type in ('swap','drop','sublet')),
  bounty_points int not null default 0 check (bounty_points >= 0),
  is_anonymous boolean not null default false,
  claimed_by uuid references profiles(id),
  status varchar(12) not null default 'open' check (status in ('open','claimed','settled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Co-living: digest aggregation buffer consumed by the digest worker
create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipient_id uuid not null references profiles(id),
  title varchar(120) not null,
  body varchar(500) not null,
  category varchar(30) not null,
  dispatch_mode varchar(10) not null check (dispatch_mode in ('immediate','digest')),
  dispatched_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_outbox_pending on notification_outbox(recipient_id) where dispatched_at is null;
```

### 2.5 Migration 0004 — functions and triggers (deterministic household logic lives in the DB)

Implement each as `security definer` functions with `set search_path = public`:

1. `fn_touch_updated_at()` — generic `BEFORE UPDATE` trigger for `updated_at` on all mutable tables.
2. `fn_feedback_set_release()` — `BEFORE INSERT` on `feedback_queue`: sets `release_at = now() + make_interval(mins => (select cool_off_minutes from households where id = new.household_id))`. Also raises exception if household profile is not `duo` — routing table hard-disabled outside Duo, per spec.
3. `fn_market_guard()` — `BEFORE INSERT` on `market_listings`: raises exception unless household profile is `shared_flat`. Duo has no market; co-living uses cohorts, not open market (spec).
4. `fn_ledger_apply()` — `AFTER INSERT` on `audit_ledger`: atomically `update profiles set points_balance = points_balance + new.points_delta where id = new.user_id`.
5. `fn_complete_assignment(p_assignment_id uuid, p_proof_path text)` — RPC. Single transaction: validates caller is `current_handler_id` (via `auth.uid()`), sets status `completed`, `completed_at = now()`, inserts `chore_completed` ledger row with `points_delta = complexity_weight * 10`, and — if recurring — creates the next assignment via `fn_next_handler`.
6. `fn_skip_assignment(p_assignment_id uuid)` — RPC implementing **turn circumvention**: marks assignment `skipped`, inserts atomic `turn_debit` ledger row (`points_delta = -complexity_weight * 10`), and creates the makeup assignment for the SAME handler on the next rotation cycle with `is_debit_makeup = true` (back-to-back enforcement). Duo-specific per spec, but implement generically and gate the back-to-back rule on `profile = 'duo'`; other profiles just take the point debit.
7. `fn_next_handler(p_chore_id uuid) returns uuid` — deterministic rotation: order household members by `profiles.id`, find current handler's index, return next index modulo member count, skipping any member who has a pending `is_debit_makeup` obligation for a different chore only when profile is `duo`. Pure SQL, no randomness — rotation must be deterministic and testable.
8. `fn_assign_cohorts(p_household_id uuid)` — co-living: `ntile(ceil(count/5))` over members ordered by id, writes `cohort_index`. Called on member join/leave via trigger on `profiles.household_id`.
9. `fn_household_equilibrium(p_household_id uuid) returns table(user_id uuid, share numeric)` — computes each member's percentage of total positive `points_delta` over a rolling 30-day window. Used by the ledger UI and the amber out-of-tolerance state.
10. `fn_join_household(p_invite_secret text) returns uuid` — RPC: hashes secret, matches `invite_code_hash`, checks `invite_expires_at > now()` and member count < `roommate_count`, sets caller's `household_id`. Runs `fn_assign_cohorts` when profile is co_living.
11. `fn_generate_invite() returns text` — RPC restricted to current members: generates 32 bytes via `gen_random_bytes`, stores sha256 hash + 7-day expiry, returns the raw secret exactly once. Client turns it into a deep link `equilibrium://join?code=...`.

Notification fan-out rule (used by triggers on `assignments` and `market_listings`): insert into `notification_outbox` with `dispatch_mode = 'digest'` when household profile is `co_living`, else `'immediate'`. A DB webhook (Supabase) on `notification_outbox` INSERT where `dispatch_mode='immediate'` calls the `push-dispatch` edge function (Phase 6). Digest rows wait for the scheduled worker.

### 2.6 Migration 0005 — Row-Level Security (complete multi-tenant isolation)

Enable RLS on every table. Helper:

```sql
create or replace function fn_my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid()
$$;
```

Policies (write ALL of these; pattern shown, replicate per table):

```sql
alter table households enable row level security;
create policy hh_select on households for select
  using (id = fn_my_household());
create policy hh_update on households for update
  using (id = fn_my_household()) with check (id = fn_my_household());
-- INSERT on households allowed for any authenticated user (creating a new household);
-- creator's profile.household_id set in the same RPC transaction.

alter table profiles enable row level security;
create policy pr_select on profiles for select
  using (id = auth.uid() or household_id = fn_my_household());
create policy pr_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

alter table chores enable row level security;
create policy ch_all on chores for select using (household_id = fn_my_household());
create policy ch_ins on chores for insert with check (household_id = fn_my_household());
create policy ch_upd on chores for update using (household_id = fn_my_household())
  with check (household_id = fn_my_household());

alter table assignments enable row level security;
-- select: household members. insert/update: ONLY via security-definer RPCs; no direct policy.
create policy as_select on assignments for select using (household_id = fn_my_household());

alter table audit_ledger enable row level security;
create policy al_select on audit_ledger for select using (household_id = fn_my_household());
-- no insert/update/delete policies for clients: ledger written only by security definer functions.

alter table feedback_queue enable row level security;
create policy fb_select on feedback_queue for select
  using (author_id = auth.uid()
     or (recipient_id = auth.uid() and release_at <= now()));  -- cool-off enforced at read time too
create policy fb_insert on feedback_queue for insert
  with check (author_id = auth.uid() and household_id = fn_my_household());

alter table market_listings enable row level security;
create policy ml_select on market_listings for select using (household_id = fn_my_household());
create policy ml_insert on market_listings for insert
  with check (lister_id = auth.uid() and household_id = fn_my_household());
create policy ml_update on market_listings for update using (household_id = fn_my_household());
-- Anonymity: expose via view market_listings_public that nulls lister_id when is_anonymous
-- and household profile enables anonymous pipelines; grant select on the view, revoke column-level
-- select on market_listings.lister_id from authenticated if is_anonymous handling requires it.

alter table notification_outbox enable row level security;
create policy no_select on notification_outbox for select using (recipient_id = auth.uid());
```

RLS test file `supabase/tests/rls.spec.sql` using pgTAP: two households, three users; assert user A cannot select/update anything in household B across every table; assert direct `insert into audit_ledger` fails as `authenticated`; assert queued feedback invisible to recipient before `release_at`.

### 2.7 Storage buckets

Via migration (storage schema policies):
- Bucket `baseline-photos` (private). Path convention `household_id/chore_id.jpg`. Policy: insert allowed once per path (immutability — deny UPDATE, deny second INSERT via `storage.objects` policy checking non-existence), select restricted to household members by parsing `household_id` from `name` with `split_part(name,'/',1)::uuid = fn_my_household()`.
- Bucket `proof-photos` (private). Same member-scoped select; insert restricted to the assignment handler.
- Bucket `avatars` (private, member-scoped read, owner-scoped write).

### 2.8 Realtime

Enable Supabase Realtime (postgres_changes) on: `assignments`, `market_listings`, `audit_ledger`, `feedback_queue`. RLS applies to realtime automatically; verify with a two-client test in Phase 4.

### 2.9 Prisma (introspection mode)

```bash
cd prisma && npx prisma db pull && npx prisma generate
```
`schema.prisma` datasource points at `DATABASE_URL` (direct connection for workers/functions). Add `previewFeatures = ["multiSchema"]` if auth schema types are needed. CI step asserts `prisma db pull` produces no diff against committed schema (drift detection between migrations and the committed Prisma schema).

### 2.10 Seed and local dev data

`supabase/seed.sql`: one duo household, one shared flat (4 members), one co-living (8 members, cohorts assigned), chores with varied `complexity_weight`, a week of assignments and ledger history so every UI state (including out-of-equilibrium amber) is reachable locally.

### 2.11 Verification Gate — Phase 2

```bash
supabase db reset          # applies all migrations + seed cleanly
supabase test db           # pgTAP RLS suite passes
cd prisma && npx prisma validate && npx prisma db pull --print | diff - schema.prisma
```
Also run a psql smoke script calling `fn_complete_assignment`, `fn_skip_assignment` (verify back-to-back makeup row + turn_debit ledger row created atomically), `fn_next_handler` determinism (call twice, same result), and `fn_household_equilibrium`.

Commit: `phase(2): schema, deterministic rotation + ledger functions, full RLS, storage, prisma`

---

## Phase 3 — App Architecture: Folders, Navigation, Data Layer, Household Profile Engine

### 3.1 Folder hierarchy (create exactly this tree)

```
app/src/
├── app/
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Native Stack: AuthGate -> Onboarding | MainTabs
│   │   ├── MainTabs.tsx             # Bottom tabs: Home, Rotation, Ledger, Household
│   │   ├── linking.ts               # deep links incl. equilibrium://join?code=
│   │   └── types.ts                 # RootStackParamList, MainTabParamList (typed navigation)
│   └── providers/
│       ├── QueryProvider.tsx        # QueryClient + SQLite persister wiring
│       └── SessionProvider.tsx      # Supabase auth state -> context
├── features/
│   ├── dashboard/      { components/ hooks/ services/ }
│   ├── rotation/       { components/ hooks/ services/ }
│   ├── ledger/         { components/ hooks/ services/ }
│   ├── onboarding/     { components/ hooks/ services/ }
│   ├── market/         { components/ hooks/ services/ }      # shared_flat only
│   ├── feedback/       { components/ hooks/ services/ }      # duo only
│   └── notifications/  { services/ }
├── shared/
│   ├── components/     # Card, Button, Screen, ListRow, EmptyState, SectionHeader, Avatar
│   ├── hooks/          # useHousehold, useHouseholdProfile, useAppState
│   └── utils/          # dates.ts, points.ts, invariant.ts
├── lib/
│   ├── supabase.ts     # client init (url polyfill, MMKV-backed auth storage)
│   ├── db/sqlite.ts    # quick-sqlite open + TanStack persister adapter
│   ├── queryKeys.ts    # single source of truth for all query keys
│   └── env.ts          # zod-validated env (react-native-config or babel inline)
└── theme/
    ├── tokens.ts       # TS mirror of tailwind colors for Skia/animated interpolation
    └── icons.ts        # re-export the exact lucide icons used (tree-shaking + consistency)
```

Rule: features never import from other features; cross-feature needs go through `shared/` or `lib/`. Add an ESLint `import/no-restricted-paths` rule enforcing this.

### 3.2 Supabase client + offline persistence

`lib/supabase.ts`: `createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { storage: mmkvStorageAdapter, autoRefreshToken: true, persistSession: true } })`.

`lib/db/sqlite.ts`: open `equilibrium.db` via `react-native-quick-sqlite`; implement a `Persister` (TanStack `experimental_createPersister`-compatible or a custom `persistQueryClient` storage adapter) storing the dehydrated cache in a `kv(key TEXT PRIMARY KEY, value TEXT)` table. Configure:
- `gcTime: 7 days`, `staleTime: 30s` default; per-query overrides in hooks.
- `PersistQueryClientProvider` with `maxAge: 7 days`, `buster` = app version string (cache invalidation across releases).
- Mutations: use TanStack `onMutate` optimistic updates + `mutationCache` with a persisted outbox pattern: failed mutations (offline) retry on reconnect via `onlineManager` wired to `@react-native-community/netinfo` (add dependency `@react-native-community/netinfo@11.4.1`).

### 3.3 Query/mutation surface (all server access lives in feature `services/`)

Define in `lib/queryKeys.ts`:
```
['household'] ['members'] ['chores'] ['assignments','active'] ['assignments','history']
['ledger', {window: 30}] ['equilibrium'] ['market','open'] ['feedback','inbox'] ['feedback','sent']
```
Services call either PostgREST table reads (RLS-scoped) or the Phase 2 RPCs (`fn_complete_assignment`, `fn_skip_assignment`, `fn_join_household`, `fn_generate_invite`) via `supabase.rpc(...)`. No raw SQL client-side. Generate DB types with `supabase gen types typescript --local > app/src/lib/database.types.ts` and type the client with it; regenerate in CI and fail on drift.

Realtime: one `RealtimeChannelManager` in `features/notifications/services/realtime.ts` subscribing to postgres_changes for the four tables, mapping each event to targeted `queryClient.invalidateQueries` calls (no manual cache surgery except assignments status flips, which patch the cache directly for instant UI).

### 3.4 Household profile engine (deterministic runtime behavior switch)

`shared/hooks/useHouseholdProfile.ts` returns a discriminated union:

```ts
type HouseholdProfile =
  | { kind: 'duo'; coolOffMinutes: number }
  | { kind: 'shared_flat'; anonymousPipelines: true }
  | { kind: 'co_living'; cohortIndex: number; digestHourLocal: number };
```

Consumed via a single `ProfileGate` component: `<ProfileGate allow={['shared_flat']}>...</ProfileGate>` controls feature visibility (Market tab hidden outside shared_flat; Feedback composer only in duo; cohort chips only in co_living). The server remains the enforcement layer (Phase 2 triggers); the client engine is presentation-only. State the invariant in code comments: client gating is UX, DB gating is security.

### 3.5 Verification Gate — Phase 3

- `npx tsc --noEmit` clean.
- Jest unit tests (add `jest@29`, `@testing-library/react-native@12`): persister round-trip (write cache, kill client, rehydrate), profile engine mapping for counts 2, 3, 5, 6, 20, queryKeys uniqueness.
- Manual: airplane mode — app cold-starts showing cached assignments from SQLite.

Commit: `phase(3): navigation shell, offline-first data layer, profile engine`

---

## Phase 4 — Screens and Interactions

Implement in this order. Every screen uses the shared `Screen` scaffold (canvas background, safe areas, Nunito, 16px gutter).

### 4.1 Home Dashboard Workspace (`features/dashboard`)

Components: `DashboardScreen`, `TaskList`, `TaskRow`, `SwipeToComplete`, `CompletionCelebration`, `DailyProgressHeader`.

- Data: `['assignments','active']` filtered to `status in ('pending','in_progress')`, ordered by `target_completion_date`, sectioned Today / Overdue / Upcoming. Overdue rows use `warn` amber accents (legitimate out-of-equilibrium signal).
- `SwipeToComplete`: `Gesture.Pan()` (Gesture Handler v2 API) + Reanimated. Track `translationX` on a shared value; threshold = 45% row width; below threshold spring back (`withSpring`, damping 18); beyond threshold animate off, fire `fn_complete_assignment` mutation with optimistic cache patch, row collapses via `Layout` transitions. Haptic on threshold cross (`react-native-haptic-feedback@2.3.3`). Right-swipe completes; left-swipe reveals actions (Skip — which calls `fn_skip_assignment` after a confirm dialog explaining the debit; List on Market when shared_flat).
- `CompletionCelebration`: `react-native-skia` full-screen transparent `Canvas` mounted only when the LAST active assignment for today completes. 120 particles, teal/sage palette from `theme/tokens.ts`, gravity + drag simulated in a single `useFrameCallback` on the UI thread; auto-unmount after 2.5s. No confetti emoji imagery — abstract circles and rounded rects only.
- Empty state: calm illustration-free card, "All settled for today." with `CheckCircle2` lucide icon.

### 4.2 Deterministic Rotation View (`features/rotation`)

Components: `RotationScreen`, `RotationCarousel`, `CycleCard`, `HandlerChip`.

- Data: derive upcoming N cycles per chore client-side by replaying `fn_next_handler` logic (port the same deterministic ordering: members sorted by id, modulo advance, duo makeup skip rule) — write it once in `shared/utils/rotation.ts` with unit tests asserting parity against a fixture exported from the SQL tests. Server remains authoritative at assignment-creation time.
- `RotationCarousel`: horizontal physics carousel: `Gesture.Pan()` + `withDecay` clamped to card snap points; scale/opacity interpolation on neighbors (`interpolate` on the shared scroll value); no ScrollView — pure Reanimated transform for 60fps.
- Duo back-to-back makeup assignments render with a `Repeat2` lucide icon and an explanatory subtitle ("Makeup turn from skipped cycle").

### 4.3 Dynamic Equilibrium Ledger (`features/ledger`)

Components: `LedgerScreen`, `BilateralBalanceSlider` (duo), `StackedContributionBar` (3+), `LedgerHistoryList`, `EquilibriumBadge`.

- Data: `fn_household_equilibrium` RPC + `['ledger']` history (paged, `range()` 30/page, infinite query).
- Branch strictly on the profile engine: `duo` renders `BilateralBalanceSlider` — a horizontal track where the thumb position = memberA share (50% is center); Reanimated spring to new positions; track tint transitions teal→amber when `abs(share-50) > household.equilibrium_tolerance` (Reanimated `interpolateColor`).
- `> 2` renders `StackedContributionBar`: one bar, one segment per member (co-living: group by cohort with expandable per-member breakdown), animated segment widths, member legend with avatars. Amber state when any member's share deviates from `100/count` by more than tolerance.
- History list rows: entry_type icon mapping (lucide: `CheckCircle2`, `AlertTriangle` for turn_debit, `ArrowLeftRight` for market_swap, etc.), signed points in teal (positive) / ink-muted (negative — amber reserved for equilibrium state, not individual rows).

### 4.4 Onboarding & Policy Initialization (`features/onboarding`)

Native stack sub-flow: `Welcome` → `CreateOrJoin` → (create path) `HouseholdBasics` (name, roommate_count with profile preview text) → `ChoreSetup` (repeatable: title, complexity weight stepper 1–10, recurrence) → `DefinitionOfDone` (per chore: DoD text + baseline photo) → `InviteShare` → done. Join path: deep link or manual code → `fn_join_household` → done.

- Baseline photo: `react-native-image-picker@7.2.3` (camera), client-side resize to max 1600px (`react-native-image-resizer` or vision-camera later; picker is sufficient), upload to `baseline-photos/{household_id}/{chore_id}.jpg`. UI marks it immutable after upload ("Baseline locked") — server enforces via storage policy.
- Invite: call `fn_generate_invite`, render the deep link + copy button (`@react-native-clipboard/clipboard`) and native share sheet (`Share` API). Show expiry. Never display the hash.
- Step state in a zustand store, wiped on completion; progress indicator is a thin teal bar, no step dots.

### 4.5 Market (shared_flat) and Feedback (duo) secondary features

- `features/market`: `MarketScreen` list of open listings (via the anonymity-aware view), claim flow → confirm → RPC `fn_claim_listing` (add this RPC in a Phase 4 migration `0006_market_claim.sql`: transfers `current_handler_id`, writes `market_swap`/`market_bounty` ledger rows for both parties atomically). Listing composer bottom sheet: type segmented control (Swap / Drop / Sublet), bounty stepper, anonymous toggle.
- `features/feedback`: duo-only composer + inbox. Inbox only shows released items (RLS already enforces; client also filters). Show "Delivers in Xh Ym" on sent items pre-release with a `Clock` icon. Retract allowed while `status = 'queued'`.

### 4.6 Verification Gate — Phase 4

- Detox or Maestro smoke flow (choose Maestro for speed: `maestro test .maestro/smoke.yaml`): onboarding create → add chore → dashboard swipe-complete → celebration fires → ledger updates.
- Reanimated: verify no frame drops with the Perf monitor on a mid-tier Android emulator profile; all gesture-driven animation must run on the UI thread (no `runOnJS` inside the frame path except terminal callbacks).
- Seeded co-living household renders cohort grouping; seeded duo renders slider; seeded imbalance renders amber.

Commit: `phase(4): dashboard, rotation carousel, equilibrium ledger, onboarding, market, feedback`

---

## Phase 5 — Push Notifications and Background Workers

### 5.1 Client (`features/notifications`)

- `services/push.ts`: request permission (iOS: `messaging().requestPermission()`; Android 13+: `POST_NOTIFICATIONS` runtime permission via Notifee). On grant, obtain FCM token; on iOS also read APNs token. Persist to `profiles.push_token_android` / `push_token_ios` via an upsert mutation; refresh on `onTokenRefresh`.
- Foreground messages: display via Notifee with two Android channels — `chores` (default importance) and `digest` (low importance). iOS categories mirror these.
- Notification taps deep-link: payload `{"route":"assignment","id":"..."}` handled in `navigation/linking.ts` (`getInitialNotification` + `onNotificationOpenedApp`).

### 5.2 Edge functions (`supabase/functions`, Deno)

1. `push-dispatch/` — invoked by DB webhook on `notification_outbox` INSERT where `dispatch_mode = 'immediate'`. Reads recipient tokens, sends via FCM HTTP v1 API (service account JSON in Supabase secrets: `FCM_SERVICE_ACCOUNT`). iOS delivery also goes through FCM (which relays to APNs); the "direct APNs" requirement is satisfied at the client transport level via Firebase's native APNs integration — record this interpretation in `docs/DECISIONS.md`. If the user later demands raw APNs HTTP/2, isolate a `apns-send.ts` module using a p8 key (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_P8` secrets) — build the module boundary now, implement FCM path first.
2. `digest-worker/` — scheduled via `supabase cron` (pg_cron migration `0007_cron.sql`) hourly: selects co_living households where `digest_hour_local` matches the current hour in `households.timezone`, aggregates undispatched outbox rows per recipient into one summary payload ("4 chores completed, 2 due tomorrow, 1 market listing"), sends one push, stamps `dispatched_at`. Idempotent: re-runs skip stamped rows.
3. `rotation-tick/` — nightly cron: creates next-cycle assignments for recurring chores whose latest assignment is completed/skipped and whose `recurrence_days` elapsed, using `fn_next_handler`. Pure orchestration; all logic stays in SQL functions.

All functions: zod-validate payloads, structured JSON logs (no emojis), return AIP-style error bodies `{ "error": { "code": ..., "status": "...", "message": "...", "details": [{"reason": "..."}] } }` for consistency with the backend-aip conventions used elsewhere in this codebase.

### 5.3 Verification Gate — Phase 5

- `supabase functions serve` + `curl` tests for all three functions with seeded data.
- Device test: complete an assignment on device A, device B (same household, shared_flat) receives immediate push; co-living seeded household receives nothing until digest hour (force by temporarily setting `digest_hour_local` to current hour).

Commit: `phase(5): push pipeline, digest worker, rotation tick`

---

## Phase 6 — CI/CD: Fastlane, Match, Store Delivery

### 6.1 Shared setup

- `app/Gemfile`: `fastlane`, `cocoapods`. `bundle install`; always invoke as `bundle exec fastlane`.
- Fastlane Match repo: private git repo `equilibrium-certificates` (user must create; add TODO to RUNBOOK). `Matchfile`: `storage_mode "git"`, `type` per lane, `app_identifier "com.equilibrium.app"`.
- Secrets via CI env (never committed): `MATCH_PASSWORD`, `APP_STORE_CONNECT_API_KEY_JSON`, `SUPABASE_ACCESS_TOKEN`, `PLAY_JSON_KEY` (Google Play service account), `FCM_SERVICE_ACCOUNT`.

### 6.2 `app/ios/fastlane/Fastfile`

```ruby
default_platform(:ios)

platform :ios do
  before_all do
    setup_ci if ENV["CI"]
    app_store_connect_api_key(key_content: ENV["APP_STORE_CONNECT_API_KEY_JSON"], is_key_content_base64: true)
  end

  lane :certs do
    match(type: "development", readonly: is_ci)
    match(type: "appstore", readonly: is_ci)
  end

  lane :bump do
    increment_build_number(build_number: latest_testflight_build_number + 1)
  end

  lane :beta do
    certs
    bump
    cocoapods(podfile: "ios/Podfile")
    build_app(scheme: "EquilibriumApp", export_method: "app-store",
              xcargs: "-allowProvisioningUpdates")
    upload_to_testflight(skip_waiting_for_build_processing: true,
                         changelog: File.read("../release-notes/latest.txt"))
  end
end
```

### 6.3 `app/android/fastlane/Fastfile`

```ruby
default_platform(:android)

platform :android do
  lane :bump do
    increment_version_code(gradle_file_path: "app/build.gradle",
      version_code: google_play_track_version_codes(track: "internal",
        json_key_data: ENV["PLAY_JSON_KEY"]).max + 1)
  end

  lane :beta do
    bump
    gradle(task: "bundle", build_type: "Release",
           properties: { "android.injected.signing.store.file" => ENV["ANDROID_KEYSTORE_PATH"],
                         "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
                         "android.injected.signing.key.alias" => ENV["ANDROID_KEY_ALIAS"],
                         "android.injected.signing.key.password" => ENV["ANDROID_KEY_PASSWORD"] })
    upload_to_play_store(track: "internal", aab: "app/build/outputs/bundle/release/app-release.aab",
                         json_key_data: ENV["PLAY_JSON_KEY"],
                         release_status: "draft")
  end
end
```

Android release signing: generate upload keystore locally, document in RUNBOOK; never commit. Configure `release` signingConfig in `android/app/build.gradle` reading from env/`keystore.properties` (gitignored). Enable ProGuard/R8 with the standard RN + Firebase + Reanimated keep rules; verify release build boots.

### 6.4 GitHub Actions (`.github/workflows`)

- `ci.yml` (every PR): checkout → node setup → `npm ci` → `tsc --noEmit` → lint + emoji check → jest → `supabase db start && supabase test db` → `supabase gen types` drift check → prisma drift check.
- `release-ios.yml` / `release-android.yml` (tag `v*`): macos-15 / ubuntu runners → `bundle exec fastlane beta`.
- `deploy-backend.yml` (main, path filter `supabase/**`): `supabase db push --linked` + `supabase functions deploy` with `SUPABASE_ACCESS_TOKEN`.

### 6.5 Verification Gate — Phase 6

- `bundle exec fastlane ios beta` and `android beta` run end-to-end locally in dry-run form (use `--verbose`; TestFlight/Play upload steps may be gated on user-provided credentials — everything before upload must succeed, including signed release builds installing on devices).
- CI green on a test PR.

Commit: `phase(6): fastlane lanes, match, signed release builds, CI workflows`

---

## Phase 7 — Hardening, Tests, Docs

1. **Unit tests (Jest)**: rotation parity (TS vs SQL fixture), equilibrium math edge cases (single active member, zero history), points formatting, profile engine, persister.
2. **pgTAP**: full RLS matrix, ledger append-only enforcement, feedback release gating, market guard by profile, invite expiry, `roommate_count` capacity enforcement in `fn_join_household`.
3. **Maestro E2E**: onboarding-create, onboarding-join via deep link, swipe-complete + celebration, skip + makeup verification (duo), market claim (shared_flat), digest visibility (co_living reads outbox in-app even before push).
4. **Performance pass**: enable Hermes (default), verify release-mode TTI < 2s on emulator, FlashList consideration — if `TaskList` exceeds ~50 rows in co-living, swap FlatList for `@shopify/flash-list@1.7.2` (record in DECISIONS.md).
5. **Docs**: complete `ARCHITECTURE.md` (module map, data flow diagram in Mermaid, profile behavior matrix), `RUNBOOK.md` (all TODO(user) items: Firebase project creation, Apple/Google credentials, Match repo, Supabase project link, keystore), `README.md` (bootstrap in <10 commands).

Final commit: `phase(7): test suites, performance pass, documentation`

---

## Appendix A — Environment variables

```
# app (.env, via react-native-config or babel-plugin-inline-dotenv; gitignored, .env.example committed)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# CI / backend secrets (never in the app bundle)
DATABASE_URL=                      # direct Postgres, prisma + workers
SUPABASE_ACCESS_TOKEN=
FCM_SERVICE_ACCOUNT=               # base64 JSON
APP_STORE_CONNECT_API_KEY_JSON=    # base64
MATCH_PASSWORD=
PLAY_JSON_KEY=
ANDROID_KEYSTORE_PATH= ANDROID_KEYSTORE_PASSWORD= ANDROID_KEY_ALIAS= ANDROID_KEY_PASSWORD=
APNS_KEY_ID= APNS_TEAM_ID= APNS_P8= # only if raw APNs module is activated
```

## Appendix B — Behavior matrix (single source of truth for profile logic)

| Capability | duo (2) | shared_flat (3–5) | co_living (6–20) |
|---|---|---|---|
| Feedback queue (cool-off) | ON | OFF | OFF |
| Anonymous pipelines | OFF (hard-disabled) | ON | ON (within cohort) |
| Chore market | OFF | ON | OFF |
| Skip → back-to-back makeup | ON | debit only | debit only |
| Push mode | immediate | immediate | daily digest |
| Ledger UI | bilateral slider | stacked bar | stacked bar grouped by cohort |
| Cohorts | — | — | ntile groups of <=5 |

## Appendix C — Explicit non-goals (do not build unless asked)

Payments/money settlement, web client, chat/messaging beyond the feedback queue, gamification badges, admin roles hierarchy (all members are peers in v1), localization beyond en-US, tablets.

---
End of plan. Begin at Phase 0.
