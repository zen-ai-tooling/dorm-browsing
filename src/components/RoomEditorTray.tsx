import { useState } from "react";
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
import { useIsTouch, useMediaQuery } from "@/hooks/use-media-query";

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
const storageTab = (item: ItemDef): TrayTab | null => {
  if (item.category === "wallpaper" || item.category === "floor") return "surfaces";
  if (item.category === "mat") return "door";
  if (item.category === "outfit") return null;
  return item.category;
};

const COACH_KEY = "dorm-vibes-editor-coach-seen";

export const RoomEditorTray = ({
  onDone,
  onTrayClick,
  onCancelPlacing,
  onTabChange,
  onOpenShop,
  onUndo,
  undoCount = 0,
  placingItemId = null,
  thumbnails = {},
  itemThumbnails = {},
}: {
  onDone: () => void;
  onTrayClick: (itemId: string) => void;
  onCancelPlacing?: () => void;
  /** the Door tab pans the camera to your door; other tabs bring it back to the room */
  onTabChange?: (tab: TrayTab) => void;
  /** empty storage offers a shortcut to the shop */
  onOpenShop?: () => void;
  onUndo?: () => void;
  undoCount?: number;
  placingItemId?: string | null;
  thumbnails?: Record<string, string>;
  /** tinted per-item thumbnails (match the room); falls back to the raw texture */
  itemThumbnails?: Record<string, { src: string }>;
}) => {
  const { ownedItemIds, roomLayout, myWallpaperId, myFloorId } = usePlayerState();
  const touch = useIsTouch();
  const narrow = useMediaQuery("(max-width: 419px)");
  const [tab, setTab] = useState<TrayTab>("furniture");
  const changeTab = (next: TrayTab) => {
    setTab(next);
    onTabChange?.(next);
  };
  const [coachSeen, setCoachSeen] = useState(() => {
    try {
      return localStorage.getItem(COACH_KEY) === "1";
    } catch {
      return true;
    }
  });
  const placedIds = new Set(roomLayout.map((p) => p.itemId));
  // newest purchases first: ownedItemIds appends, so storage lists in reverse
  const owned = ownedItemIds
    .map((id) => ITEM_CATALOG[id])
    .filter((i): i is ItemDef => !!i && !placedIds.has(i.id))
    .reverse();
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
      <div className="flex items-center justify-between gap-1 min-[420px]:gap-3">
        <p className={`min-w-0 font-display font-bold text-panel-muted ${placingItemId ? "text-xs" : "whitespace-nowrap text-[10px] min-[420px]:text-xs"}`}>
          {placingItemId
            ? `Placing ${ITEM_CATALOG[placingItemId]?.name ?? "item"} — tap a green tile`
            : narrow
              ? `Storage ${owned.length} · Room ${roomLayout.length}`
              : `In storage · ${owned.length}  ·  In room · ${roomLayout.length}`}
        </p>
        <div className="flex shrink-0 items-center gap-1 min-[420px]:gap-2 [&>button]:px-2 min-[420px]:[&>button]:px-3">
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
            variant="secondary"
            disabled={undoCount === 0}
            onClick={() => onUndo?.()}
            className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80 disabled:opacity-40"
          >
            Undo
          </Button>
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
      {!coachSeen && !placingItemId ? (
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(COACH_KEY, "1");
            } catch {
              /* private mode */
            }
            setCoachSeen(true);
          }}
          className="mt-1.5 flex w-full items-center justify-between rounded-[3px] border-2 border-ink bg-primary/20 px-2 py-1 text-left font-body text-[11px] text-panel-foreground"
        >
          <span>{touch ? "Drag to move · tap to select · tap again to pick what's underneath" : "Drag to move · tap to select · R to rotate · Ctrl+Z to undo"}</span>
          <span className="font-display text-[10px] font-bold text-panel-muted">OK</span>
        </button>
      ) : null}

      <Tabs value={tab} className="mt-2" onValueChange={(v) => changeTab(v as TrayTab)}>
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
          const otherTabs = TABS.filter((t) => t !== category && owned.some((i) => storageTab(i) === t));
          const elsewhere = owned.filter((i) => {
            const destination = storageTab(i);
            return destination !== null && otherTabs.includes(destination);
          }).length;
          return (
            <TabsContent key={category} value={category}>
              <ScrollArea className="h-28 pr-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-start gap-2 pt-3">
                    <p className="font-body text-xs text-panel-muted">
                      {elsewhere > 0
                        ? `No ${TAB_LABEL[category].toLowerCase()} in storage — ${elsewhere} ${elsewhere === 1 ? "item" : "items"} in other tabs`
                        : placedIds.size > 0
                        ? "Everything you own is out in the room."
                        : "Nothing here yet — your dorm is a blank canvas."}
                    </p>
                    {otherTabs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {otherTabs.map((other) => (
                          <Button key={other} size="sm" variant="link" className="h-auto p-0 font-body text-xs" onClick={() => { sfx.uiClick(); changeTab(other); }}>
                            {TAB_LABEL[other]}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {onOpenShop ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          sfx.uiClick();
                          onOpenShop();
                        }}
                        className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
                      >
                        Browse Floor 3 Supply
                      </Button>
                    ) : null}
                  </div>
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
