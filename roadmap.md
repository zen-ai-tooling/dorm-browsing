# Campus Life

- [x] Open campus grid/gate, shared waypoint graph and reachability tests
- [x] Library, clock, seasonal oak, Quad stops and nighttime lights
- [x] Seeded students, activities/overheards and animals/Professor
- [x] Real resident away destinations and Quad sketching
- [x] Daily fountain action/save normalization, campus popups, dev controls
- [x] 131 tests; browser: connected live-grid paths, keyboard gate crossing, phone-sized click walk, fortune/reload, density bands, petting, resident arrival, night library, cat couch

Verification limits: not a complete room-to-Quad-and-back input journey; touch-device performance and animal scatter/climb timing were not exhaustively checked. Resident arrival and bedtime checks advanced the live simulation for long routes.

# Small editor follow-ups

- [x] Phone room fits screen width and meets tray with hallway hidden
- [x] Touch selection buttons stay 44 screen pixels at any zoom
- [x] Touch-only coach copy; desktop keyboard copy unchanged
- [x] Per-tab empty messages and tappable other tabs; compact one-line header under 420px
- [x] Phone browser checks and existing placement/resident tests

# Room Editor Overhaul (footprints, rug layer, walkability, UX)

- [x] items.ts: measured footprints, layer (rug/floor/wall), solid flags per spec
- [x] placement.ts: layered collision, rejection reasons, walkability flood fill, migration
- [x] Seed + save migration: rug_woven as a real placed item (3,3)
- [x] DormScene: base anchoring, remove myRug, ghost follows pointer, player fade in edit
- [x] Editor UX: rejection tooltips, undo (20, Ctrl+Z, recolor refund), grid, keyboard, tap cycling, phone targets/zoom/vibrate, tray counts/coach mark/empty state, feel polish, Saved toast
- [x] Tests: placement.test.ts overhaul + residents.test.ts .ok fix; 119 pass, typecheck clean, build OK

Verification limits: browser checked edit mode (grid, hatched door lane, faded player, tray counts, coach mark, empty state, rug as real item, neighbor rooms with base anchoring). Not browser-verified: drag-and-drop move, ghost placement click-through, undo button action, arrow nudge selection, phone viewport (390×844), recolor refund via undo. Test save had a stuck inside-room flag requiring a manual nudge — worth a fresh-save pass.

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
