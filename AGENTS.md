<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Room row 0 (first interior row) of personal/common rooms is a WALL "face"; wall-mount items (ItemDef.mount="wall") live only there, and placement rules live in src/data/placement.ts (tested with `bun test ./src/data/placement.test.ts`) so the editor and save migration share one rule.
- The hallway also has a 2-row back-wall face (rows 16–17, bedroom doorway columns open); face tiles are painted from DormScene.faceOwner, never zoneNear, because row 16 is shared with the bedrooms' bottom ring.
- In-world text lives on wall-mounted signs (DormScene.wallSign), never floating on floors — the only exception is the common-room door labels in the hall.
- Hallway decor never goes on row 22 (the hallway/common-room shared wall): its visible side is the common rooms' back-wall face.
- Songs/watching/bulletin content shapes live in src/data/dorm.ts; save normalization, legacy-board migration and "in common" matching live in src/data/interests.ts (tested in interests.test.ts) so the store and popups share one rule. Song/polaroid covers come from the deterministic generator in src/lib/coverArt.ts; sticker icons are string-grid bitmaps in src/data/stickers.ts (never lucide) to keep the pixel look.
- Item recoloring has one rule, displayTintFor in src/data/items.ts, used by both DormScene and the shop/tray thumbnails (src/lib/itemThumbs.ts, keyed by item id) so the shop always shows in-room colors. Collection sets are declared once in ITEM_SETS (items.ts) and assign ItemDef.set; set rewards are paid inside playerActions.buy and recorded in PlayerState.completedSets (tested in src/lib/shopSets.test.ts).
- Day/night: phase hours and looks live in src/game/timeOfDay.ts (pure, tested in timeOfDay.test.ts); the dev/`?time=` override is session-only in src/lib/timeStore.ts so a stale override can never stick for players.
- Night lighting lives in src/game/lighting.ts: register a light where its prop is created (DormScene.light / itemLight for ItemDef.light); the darkness RenderTexture redraws only when a light is added, removed or moved, never per frame. Editor UI (selection, ghost, highlight, guides) must stay above LIGHT_DEPTH so editing at night stays readable.
- Personal-room face columns WINDOW_COLS (placement.ts) are the window: no wall item may cover them, enforced in canPlaceIn so the editor and save migration share it.
- Daily check-in logic is pure and seeded so reloads never change results: prompts, resident picks and the floor split in src/data/prompts.ts; the date-seeded mail roll + pity in src/data/mail.ts; quest definitions and old-save auto-complete (no rewards) in src/data/quests.ts. Rewards are paid only inside playerStore actions (answerDaily, openPackage, completeQuest) and tested in src/lib/dailyCheckIn.test.ts.
- Mail exclusives are catalog items with ItemDef.exclusive="mail": filter them out of the shop with isShopItem and reject them in playerActions.buy.
- Test files that import playerStore must call __resetStoreForTests() before hydrating, because bun shares one module instance across test files.
