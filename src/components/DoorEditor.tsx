import { roomNameFor } from "@/data/avatar";
import { BOARD_MAX, DOOR_STICKER_MAX, PLATE_MAX, PLATE_STYLES, type PlateStyle } from "@/data/door";
import { ITEM_CATALOG, MAT_DEFAULT, MAT_ITEM_IDS, RECOLOR_PALETTE } from "@/data/items";
import { STICKERS } from "@/data/stickers";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import { PixelIcon } from "./PixelIcon";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const PLATE_LABEL: Record<PlateStyle, string> = { cream: "Cream", dark: "Dark", wood: "Wood", neon: "Neon" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-1">
    <h4 className="font-display text-[10px] font-bold uppercase tracking-widest text-panel-muted">{title}</h4>
    {children}
  </section>
);

const chip = (on: boolean) =>
  `rounded-[3px] border-2 px-2 py-0.5 font-display text-[11px] font-bold ${
    on ? "border-ink bg-ink text-panel" : "border-ink/50 bg-panel text-panel-foreground hover:bg-panel-foreground/10"
  }`;

/** the editor tray's Door tab: frame, nameplate, stickers, board, mat — all applied live */
export const DoorEditor = ({ thumbnails = {} }: { thumbnails?: Record<string, { src: string }> }) => {
  const { door, playerName, ownedItemIds } = usePlayerState();
  const mats = MAT_ITEM_IDS.filter((id) => id === MAT_DEFAULT || ownedItemIds.includes(id));

  return (
    <div className="space-y-2.5 pt-2">
      <Section title="Frame">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={chip(door.frameColor === null)}
            onClick={() => {
              sfx.uiClick();
              playerActions.setDoor({ frameColor: null });
            }}
          >
            Room accent
          </button>
          {RECOLOR_PALETTE.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              aria-label={`Frame ${p.name}`}
              aria-pressed={door.frameColor === p.color}
              onClick={() => {
                sfx.uiClick();
                playerActions.setDoor({ frameColor: p.color });
              }}
              className={`size-5 border-2 border-ink ${door.frameColor === p.color ? "outline outline-2 outline-offset-1 outline-ink" : ""}`}
              style={{ backgroundColor: hex(p.color) }}
            />
          ))}
        </div>
      </Section>

      <Section title="Nameplate">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={door.plateText ?? ""}
            maxLength={PLATE_MAX}
            placeholder={roomNameFor(playerName)}
            aria-label="Nameplate text"
            onChange={(e) => playerActions.setDoor({ plateText: e.target.value })}
            className="h-7 min-w-[140px] flex-1 rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-xs text-panel-foreground outline-none"
          />
          {PLATE_STYLES.map((st) => (
            <button
              key={st}
              type="button"
              className={chip(door.plateStyle === st)}
              onClick={() => {
                sfx.uiClick();
                playerActions.setDoor({ plateStyle: st });
              }}
            >
              {PLATE_LABEL[st]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={`Stickers · ${door.stickers.length}/${DOOR_STICKER_MAX}`}>
        <div className="flex max-h-[58px] flex-wrap gap-1 overflow-y-auto pr-1">
          {STICKERS.map((st) => {
            const on = door.stickers.includes(st.id);
            const full = !on && door.stickers.length >= DOOR_STICKER_MAX;
            return (
              <button
                key={st.id}
                type="button"
                title={st.label}
                aria-label={st.label}
                aria-pressed={on}
                disabled={full}
                onClick={() => {
                  sfx.uiClick();
                  playerActions.setDoor({
                    stickers: on ? door.stickers.filter((x) => x !== st.id) : [...door.stickers, st.id],
                  });
                }}
                className={`rounded-[3px] border-2 p-0.5 ${on ? "border-ink bg-primary/30" : "border-transparent hover:border-ink/40"} ${
                  full ? "opacity-35" : ""
                }`}
              >
                <PixelIcon def={st} size={18} />
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Whiteboard">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={chip(door.boardMode === "answer")}
            onClick={() => {
              sfx.uiClick();
              playerActions.setDoor({ boardMode: "answer" });
            }}
          >
            Today's answer
          </button>
          <button
            type="button"
            className={chip(door.boardMode === "custom")}
            onClick={() => {
              sfx.uiClick();
              playerActions.setDoor({ boardMode: "custom" });
            }}
          >
            Custom message
          </button>
          {door.boardMode === "custom" ? (
            <input
              value={door.boardText ?? ""}
              maxLength={BOARD_MAX}
              placeholder="back in 5 ✌"
              aria-label="Whiteboard message"
              onChange={(e) => playerActions.setDoor({ boardText: e.target.value })}
              className="h-7 min-w-[140px] flex-1 rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-xs text-panel-foreground outline-none"
            />
          ) : null}
        </div>
      </Section>

      <Section title="Welcome mat">
        <div className="flex flex-wrap gap-1.5">
          {mats.map((id) => {
            const item = ITEM_CATALOG[id]!;
            const on = door.matId === id;
            const src = thumbnails[id]?.src;
            return (
              <button
                key={id}
                type="button"
                title={item.name}
                aria-pressed={on}
                onClick={() => {
                  sfx.placeItem();
                  playerActions.setDoor({ matId: id });
                }}
                className={`flex w-16 flex-col items-center gap-0.5 rounded-[3px] border-2 p-1 ${
                  on ? "border-ink bg-primary/30" : "border-ink/40 bg-panel hover:bg-panel-foreground/10"
                }`}
              >
                {src ? <img src={src} alt="" className="h-6 w-auto [image-rendering:pixelated]" /> : null}
                <span className="w-full truncate text-center font-body text-[9px] text-panel-muted">{item.name}</span>
              </button>
            );
          })}
        </div>
        {mats.length < MAT_ITEM_IDS.length ? (
          <p className="font-body text-[10px] text-panel-muted">More mats in the shop under Walls &amp; Floors.</p>
        ) : null}
      </Section>
    </div>
  );
};
