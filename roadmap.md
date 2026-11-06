# Pre-test fixes

- [x] Ownership-aware save decisions, single boot, race-safe sign-out/reset, regression tests
- [x] Session-only eligibility and once-per-trigger save reminders, tests
- [x] Durable offline feedback queue (20 max), reconnect/load retry, tests
- [x] Stronger night pools, ambient halo fade, outdoor wall-only clipping
- [x] 104 tests pass; build OK; signed-in offline feedback delivered on reconnect; 23:00 desktop/phone checked
- [x] Mocked cloud browser checks: empty foreign save loads cloud, guest progress shows conflict, new account carries local, startup fetch/upload each once, immediate flush, no upload after delete

Verification limits: real Google/email round-trips, full sign-out/reset reload against a real second account, and the far courtyard lamp were not exercised; these require tester accounts/non-destructive reset approval.

# Iteration 27 — Accounts: Guest-First Sign-In + Cloud Saves

First backend (Lovable Cloud). Gameplay, rendering, economy, dev mode unchanged.

## Backend
- [x] Enable anonymous users, Google (managed), email OTP (6-digit)
- [x] Migration: player_saves, profiles, feedback + RLS + grants
- [x] Handle rules: 3–20 chars [a-z0-9_] lowercase, reserved list (+ handle_available fn)

## playerStore.ts
- [x] Extract pure exported normalizeSave(parsed): PlayerState
- [x] Add savedAt (ms) set in persist()
- [x] Tests: current save round-trips; old save migrates the same (saveNormalize.test.ts)

## New modules
- [x] src/lib/auth.ts — silent anonymous sign-in, link Google/email, sign out
- [x] src/lib/saveSync.ts — boot fetch/merge, 2s debounced upsert, visibilitychange flush, offline retry, sync status

## UI
- [x] Me button → Me menu (Edit avatar / Save your dorm or @handle / Sign in|out / Send feedback) + guest dot + sync icon
- [x] SaveDormPanel.tsx (Google link, email code, handle picker w/ availability + suggestions)
- [x] ConflictDialog.tsx (side-by-side dorms, never merge, device-progress rule)
- [x] FeedbackPanel.tsx (4 kinds, note ≤1000, auto context) + desktop top-bar Feedback chip
- [x] MoveIn.tsx step 1: "Already have a dorm? Sign in"
- [x] Soft "save your dorm" card: after move-in, first purchase, 3rd day; max once/day

## DevPanel
- [x] Reset everything also deletes player_saves row
- [x] Copy user id + Sign out (dev) buttons

## Never synced
- [x] dev flag, muted, time override stay device-local

## Docs
- [x] AGENTS.md go-live checklist

## Verify
- [x] bun test (93 pass), typecheck, build OK
- [x] Browser: instant guest boot (no prompt), player_saves row appears, Me menu, save panel, feedback insert with context
- [ ] Not browser-tested: Google OAuth round-trip, email code, conflict dialog, offline retry, second-device sign-in
