import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ITEM_CATALOG, isPlaceable } from "@/data/items";
import { usePlayerState } from "@/lib/playerStore";

export const RoomEditorTray = ({
  onDone,
  onTrayClick,
  thumbnails = {},
}: {
  onDone: () => void;
  onTrayClick: (itemId: string) => void;
  thumbnails?: Record<string, string>;
}) => {
  const { ownedItemIds, roomLayout } = usePlayerState();
  const placedIds = new Set(roomLayout.map((p) => p.itemId));
  const tray = ownedItemIds
    .map((id) => ITEM_CATALOG[id])
    .filter((i) => !!i && isPlaceable(i) && !placedIds.has(i.id));

  return (
    <Card className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(94vw,560px)] -translate-x-1/2 gap-0 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Editing your room — drag items to move, tap the X to remove
        </p>
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
      <ScrollArea className="mt-2 max-h-28">
        {tray.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Everything you own is placed. Visit the Shop for more.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tray.map((item) => {
              const thumb = thumbnails[item!.textureKey];
              return (
                <li key={item!.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", item!.id)}
                    onClick={() => onTrayClick(item!.id)}
                    className="flex w-20 flex-col items-center gap-1 rounded-lg border border-border bg-secondary px-1.5 py-1.5 transition hover:border-primary"
                  >
                    <span className="flex h-10 w-full items-center justify-center">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item!.name}
                          className="max-h-10 w-auto [image-rendering:pixelated]"
                        />
                      ) : null}
                    </span>
                    <span className="w-full truncate text-center text-[10px] font-medium text-foreground">
                      {item!.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
};
