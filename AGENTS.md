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
