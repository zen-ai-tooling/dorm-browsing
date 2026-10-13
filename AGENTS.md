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
- Hallway decor never goes on row 22 (the hallway/common-room shared wall): its visible side is the common rooms' back-wall face.
