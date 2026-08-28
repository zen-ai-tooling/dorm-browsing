import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ITEM_CATALOG, isPlaceable, type ItemDef } from "@/data/items";
import { usePlayerState } from "@/lib/playerStore";
import { GamePanel } from "./GamePanel";
import { sfx } from "@/game/sounds";

const CATEGORY_LABEL: Record<ItemDef["category"], string> = {
  furniture: "Furniture",
  companion: "Companions",
  wallpaper: "Wallpaper",
  poster: "Posters",
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ItemDef["category"][];

export const RoomEditorTray = ({
  onDone,
  onTrayClick,
  onCancelPlacing,
  placingItemId = null,
  thumbnails = {},
}: {
  onDone: () => void;
  onTrayClick: (itemId: string) => void;
  onCancelPlacing?: () => void;
  placingItemId?: string | null;
  thumbnails?: Record<string, string>;
}) => {
  const { ownedItemIds, roomLayout } = usePlayerState();
  const placedIds = new Set(roomLayout.map((p) => p.itemId));
  const owned = ownedItemIds
    .map((id) => ITEM_CATALOG[id])
    .filter((i): i is ItemDef => !!i && !placedIds.has(i.id));

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

      <Tabs defaultValue="furniture" className="mt-2">
        <TabsList className="w-full rounded-[3px] border-2 border-ink bg-panel-foreground/5">
          {CATEGORIES.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              onClick={() => sfx.uiClick()}
              className="flex-1 rounded-[2px] font-display text-[11px] font-bold"
            >
              {CATEGORY_LABEL[category]}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((category) => {
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
                      const thumb = thumbnails[item.textureKey];
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
                            className={`flex w-20 flex-col items-center gap-1 rounded-[3px] border-2 px-1.5 py-1.5 transition ${
                              active
                                ? "border-ink bg-primary/30"
                                : "border-ink bg-panel hover:bg-panel-foreground/10"
                            } ${placeable ? "" : "cursor-default opacity-60"}`}
                          >
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
      </Tabs>
    </GamePanel>
  );
};
