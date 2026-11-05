import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FLOOR_DEFAULT,
  FLOOR_ITEM_IDS,
  ITEM_CATALOG,
  isPlaceable,
  WALLPAPER_DEFAULT,
  WALLPAPER_ITEM_IDS,
  type ItemDef,
} from "@/data/items";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { GamePanel } from "./GamePanel";
import { DoorEditor } from "./DoorEditor";
import { sfx } from "@/game/sounds";

export type TrayTab = "furniture" | "companion" | "poster" | "surfaces" | "door";

/** outfits are worn, never placed — they live in the avatar creator, not the tray */
const TAB_LABEL: Record<TrayTab, string> = {
  furniture: "Furniture",
  companion: "Companions",
  poster: "Posters",
  surfaces: "Walls & Floors",
  door: "Door",
};
const TABS = Object.keys(TAB_LABEL) as TrayTab[];
const PLACE_TABS: Array<ItemDef["category"] & TrayTab> = ["furniture", "companion", "poster"];

export const RoomEditorTray = ({
  onDone,
  onTrayClick,
  onCancelPlacing,
  onTabChange,
  placingItemId = null,
  thumbnails = {},
  itemThumbnails = {},
}: {
  onDone: () => void;
  onTrayClick: (itemId: string) => void;
  onCancelPlacing?: () => void;
  /** the Door tab pans the camera to your door; other tabs bring it back to the room */
  onTabChange?: (tab: TrayTab) => void;
  placingItemId?: string | null;
  thumbnails?: Record<string, string>;
  /** tinted per-item thumbnails (match the room); falls back to the raw texture */
  itemThumbnails?: Record<string, { src: string }>;
}) => {
  const { ownedItemIds, roomLayout, myWallpaperId, myFloorId } = usePlayerState();
  const placedIds = new Set(roomLayout.map((p) => p.itemId));
  const owned = ownedItemIds
    .map((id) => ITEM_CATALOG[id])
    .filter((i): i is ItemDef => !!i && !placedIds.has(i.id));
  const papers = [WALLPAPER_DEFAULT, ...WALLPAPER_ITEM_IDS.filter((id) => ownedItemIds.includes(id))];
  const floors = FLOOR_ITEM_IDS.filter((id) => id === FLOOR_DEFAULT || ownedItemIds.includes(id));

  const thumbOf = (item: ItemDef | undefined) =>
    item ? (itemThumbnails[item.id]?.src ?? thumbnails[item.textureKey]) : undefined;

  const surfaceButton = (id: string, on: boolean, label: string, onPick: () => void) => {
    const src = thumbOf(ITEM_CATALOG[id]);
    return (
      <li key={id}>
        <button
          type="button"
          aria-pressed={on}
          onClick={onPick}
          className={`flex w-20 flex-col items-center gap-1 rounded-[3px] border-2 px-1.5 py-1.5 transition ${
            on ? "border-ink bg-primary/30" : "border-ink bg-panel hover:bg-panel-foreground/10"
          }`}
        >
          <span className="flex size-8 items-center justify-center overflow-hidden border-2 border-ink bg-panel">
            {src ? <img src={src} alt="" className="size-full [image-rendering:pixelated]" /> : (
              <span className="font-display text-[9px] font-bold text-panel-muted">plain</span>
            )}
          </span>
          <span className="w-full truncate text-center font-display text-[10px] font-bold text-panel-foreground">
            {label}
          </span>
        </button>
      </li>
    );
  };

  return (
    <GamePanel
      accent="#c9a227"
      className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(94vw,560px)] -translate-x-1/2 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-panel-muted">
          {placingItemId
            ? `Placing ${ITEM_CATALOG[placingItemId]?.name ?? "item"} — tap a green tile`
            : "Tap an item, then tap a tile — or drag items already in the room"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {placingItemId ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                sfx.uiClick();
                onCancelPlacing?.();
              }}
              className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
            >
              Cancel
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              sfx.uiClick();
              onDone();
            }}
            className="rounded-[3px] border-2 border-ink font-display font-bold"
          >
            Done
          </Button>
        </div>
      </div>

      <Tabs defaultValue="furniture" className="mt-2" onValueChange={(v) => onTabChange?.(v as TrayTab)}>
        <TabsList className="h-auto w-full flex-wrap rounded-[3px] border-2 border-ink bg-panel-foreground/5">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              onClick={() => sfx.uiClick()}
              className="flex-1 rounded-[2px] font-display text-[11px] font-bold"
            >
              {TAB_LABEL[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
        {PLACE_TABS.map((category) => {
          const items = owned.filter((i) => i.category === category);
          return (
            <TabsContent key={category} value={category}>
              <ScrollArea className="h-28 pr-2">
                {items.length === 0 ? (
                  <p className="pt-3 font-body text-xs text-panel-muted">
                    Nothing here yet — visit the Shop.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2 pt-2">
                    {items.map((item) => {
                      const thumb = thumbOf(item);
                      const active = placingItemId === item.id;
                      const placeable = isPlaceable(item);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            draggable={placeable}
                            disabled={!placeable}
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                            onClick={() => onTrayClick(item.id)}
                            className={`relative flex w-20 flex-col items-center gap-1 rounded-[3px] border-2 px-1.5 py-1.5 transition ${
                              active
                                ? "border-ink bg-primary/30"
                                : "border-ink bg-panel hover:bg-panel-foreground/10"
                            } ${placeable ? "" : "cursor-default opacity-60"}`}
                          >
                            {item.exclusive === "mail" ? (
                              <span className="absolute -right-1 -top-1 border-2 border-ink bg-[var(--tag-premium)] px-0.5 font-display text-[8px] font-bold leading-none text-ink">
                                MAIL
                              </span>
                            ) : null}
                            <span className="flex h-10 w-full items-center justify-center">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={item.name}
                                  className="max-h-10 w-auto [image-rendering:pixelated]"
                                />
                              ) : null}
                            </span>
                            <span className="w-full truncate text-center font-display text-[11px] font-bold text-panel-foreground">
                              {item.name}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </TabsContent>
          );
        })}
        <TabsContent value="surfaces">
          <ScrollArea className="h-36 pr-2">
            <h4 className="pt-2 font-display text-[10px] font-bold uppercase tracking-widest text-panel-muted">
              Wallpaper
            </h4>
            <ul className="flex flex-wrap gap-2 pt-1">
              {papers.map((id) =>
                surfaceButton(id, myWallpaperId === id, ITEM_CATALOG[id]?.name ?? "Plain", () =>
                  playerActions.setWallpaper(id),
                ),
              )}
            </ul>
            <h4 className="pt-2 font-display text-[10px] font-bold uppercase tracking-widest text-panel-muted">
              Floors
            </h4>
            <ul className="flex flex-wrap gap-2 pt-1">
              {floors.map((id) =>
                surfaceButton(id, myFloorId === id, ITEM_CATALOG[id]!.name, () => playerActions.setFloor(id)),
              )}
            </ul>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="door">
          <ScrollArea className="h-44 pr-2">
            <DoorEditor thumbnails={itemThumbnails} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </GamePanel>
  );
};
