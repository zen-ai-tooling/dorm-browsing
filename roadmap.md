# Iteration 26b — Polish Pass (night lighting, HUD, overlaps)

Scope: lighting.ts, timeOfDay.ts, DormScene.ts, DormGame.tsx, DormPopup.tsx, WelcomeQuests.tsx. No new features; no changes to phase hours, schedules, dialogue, quests, rewards, shop, editor, avatar.

## 1. Night look rebuild (lighting.ts)
- [x] a) Darkness RT → MULTIPLY blend, fill 0x3a4686, alpha = night; update DARKNESS_COLOR/ALPHA + backdrop math in applyLook
- [x] b) Glows → colored floor pools at depth ~1.6 (below props), alpha ~0.2, separate pool texture
- [x] c) Per-radius-bucket light textures (round to 8px), 1:1 art px, 3 hard stepped rings, no checker; mask 1/0.7/0.38 @ 55/78/100%; pool 1/0.55/0.25 @ 42/72/100%; squash y ×0.87; cache `light-m-40`/`light-p-40`
- [x] d) Clip every light to its zone (incl. 2 face rows) via setCrop + rt.draw; outdoor lights clip to "not inside any building"; string lights: bulb radius 8 no pool + one faint long pool strip along wire
- [x] e) Player halo → cut-out only, radius ~30 at feet, fades when inside another light's radius
- [x] f) Rooms with someone home/awake get ~0.35 alpha floor-rect erase (warm ceiling ambient); common rooms lit 18:00–01:00
- [x] g) All decorative light pools gated on night > 0

## 2. HUD one clean bar (DormGame.tsx)
- [x] Desktop: single slim top bar — left: Floor 3 logo chip, coins, phase, mail dot; right: Shop, Edit My Room, Me, sound; controls help into "?" chip (keeps seenControls first-move behavior)
- [x] Phone: icon-only dock, equal-width buttons, coin count only text; phase icon folded into coin chip corner; fits 360px

## 3. Overlaps
- [x] Quest card collapses to chip while any popup/sheet open; restores on close (WelcomeQuests.tsx)
- [x] Coin-pop anchors to the completed quest's own row (mail cubby bug)
- [x] Knock pill positioned like "Tap to open" pill (near player desktop, above dock phone)
- [x] Unique resident anchor tiles + test (no two residents share an anchor tile same hour)
- [x] Resident within ~12px of player: turns to face + shuffles one free tile aside (2-step walk); talk range unchanged

## 4. Mail reveal (DormPopup.tsx)
- [x] 3-frame box open, reward pops at ×4 with stepped sparkle burst, then text
- [x] coins: pixel coin pile; postcard: card + handwritten line; exclusive: sprite + "MAIL FIND" ribbon + "2/6" progress; jackpot: bigger pile + 2-beat coin shower
- [x] sfx.coin() on coins, distinct chime for items; keep "Next delivery tomorrow"

## 5. Consistency
- [x] Common-room labels → plaque style like LOST & FOUND, on hall bottom edge above each doorway; update AGENTS.md note
- [x] Resident music notes clipped to room rect (no drift over hall face/nameplates)

## Verify
- [x] Dev clock 23:00: deep blue, readable lights, no checker rims, no wall leaks, Your Room lit when inside, Jordan's dark when away
- [x] 9:00/13:00: no pools; desktop one bar + window visible; 360/390px dock fits; quest card collapses under popups
- [x] Mail reveal per reward type (dev reset)
- [x] bun test passes incl. unique-anchor test; RT redraws only on light change
