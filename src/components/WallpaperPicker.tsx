import { X } from "lucide-react";
import { ITEM_CATALOG, WALLPAPER_ITEM_IDS, WALLPAPER_DEFAULT } from "@/data/items";
import { usePlayerState } from "@/lib/playerStore";
import { GamePanel, IconChip } from "./GamePanel";
import { sfx } from "@/game/sounds";

/** Tap-a-wall wallpaper swap: only wallpapers the player owns are offered. */
export const WallpaperPicker = ({
  equippedId,
  thumbnails,
  onPick,
  onClose,
}: {
  equippedId: string;
  thumbnails: Record<string, string>;
  onPick: (itemId: string) => void;
  onClose: () => void;
}) => {
  const { ownedItemIds } = usePlayerState();
  const owned = WALLPAPER_ITEM_IDS.filter((id) => ownedItemIds.includes(id));

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 w-[min(92vw,380px)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <GamePanel accent="#7f9c86" className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold tracking-wide text-panel-foreground">
            Wallpaper
          </h2>
          <button
            type="button"
            aria-label="Close wallpaper picker"
            onClick={() => {
              sfx.uiClick();
              onClose();
            }}
          >
            <IconChip>
              <X className="size-3.5" aria-hidden />
            </IconChip>
          </button>
        </div>
        <p className="mt-1 font-body text-[11px] text-panel-muted">
          Tap a swatch to repaint your walls. Buy more in the shop.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[WALLPAPER_DEFAULT, ...owned].map((id) => {
            const item = ITEM_CATALOG[id];
            const src = item ? thumbnails[item.textureKey] : undefined;
            const equipped = id === equippedId;
            return (
              <button
                key={id}
                type="button"
                title={item?.name ?? "Default"}
                onClick={() => onPick(id)}
                className={`flex flex-col items-center gap-1 rounded-[3px] border-2 p-1.5 transition ${
                  equipped
                    ? "border-ink bg-panel-foreground/10"
                    : "border-ink/40 hover:bg-panel-foreground/5"
                }`}
              >
                <span className="flex size-10 items-center justify-center overflow-hidden border-2 border-ink bg-panel">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      className="size-full [image-rendering:pixelated]"
                      aria-hidden
                    />
                  ) : (
                    <span className="font-display text-[10px] font-bold text-panel-muted">
                      plain
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 text-center font-body text-[9px] leading-tight text-panel-muted">
                  {item?.name ?? "Plain"}
                </span>
              </button>
            );
          })}
        </div>
        {owned.length === 0 ? (
          <p className="mt-3 font-body text-xs italic text-panel-muted/80">
            No wallpapers owned yet — the shop has five.
          </p>
        ) : null}
      </GamePanel>
    </div>
  );
};
