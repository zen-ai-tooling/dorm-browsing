# Iteration 27 — Accounts: Guest-First Sign-In + Cloud Saves

First backend (Lovable Cloud). Gameplay, rendering, economy, dev mode unchanged.

## Backend
- [ ] Enable anonymous users, Google (managed), email OTP (6-digit)
- [ ] Migration: player_saves, profiles, feedback + RLS + grants
- [ ] Handle rules: 3–20 chars [a-z0-9_] lowercase, reserved list

## playerStore.ts
- [ ] Extract pure exported normalizeSave(parsed): PlayerState
- [ ] Add savedAt (ms) set in persist()
- [ ] Tests: current save round-trips; old save migrates the same

## New modules
- [ ] src/lib/auth.ts — silent anonymous sign-in, link Google/email, sign out
- [ ] src/lib/saveSync.ts — boot fetch/merge, 2s debounced upsert, visibilitychange flush, offline retry, sync status

## UI
- [ ] Me button → Me menu (Edit avatar / Save your dorm or @handle / Sign in|out / Send feedback) + guest dot + sync icon
- [ ] SaveDormPanel.tsx (Google link, email code, handle picker w/ availability + suggestions)
- [ ] ConflictDialog.tsx (side-by-side dorms, never merge, device-progress rule)
- [ ] FeedbackPanel.tsx (4 kinds, note ≤1000, auto context) + desktop top-bar Feedback chip
- [ ] MoveIn.tsx step 1: "Already have a dorm? Sign in"
- [ ] Soft "save your dorm" card: after move-in, first purchase, 3rd day; max once/day

## DevPanel
- [ ] Reset everything also deletes player_saves row
- [ ] Copy user id + Sign out (dev) buttons

## Never synced
- [ ] dev flag, muted, time override stay device-local

## Docs
- [ ] AGENTS.md go-live checklist (lock dev mode, server-validated coins, CAPTCHA+guest cleanup, age gate/terms/moderation, public profiles)

## Verify
- [ ] bun test passes incl. normalizeSave tests; typecheck; browser smoke
