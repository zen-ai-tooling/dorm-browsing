import { Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ITEM_CATALOG, type ItemDef } from "@/data/items";
import { playerActions, usePlayerState } from "@/lib/playerStore";

const CATEGORY_LABEL: Record<ItemDef["category"], string> = {
  furniture: "Furniture",
  companion: "Companions",
  wallpaper: "Wallpaper",
  poster: "Posters",
};

const groups = (): Array<[ItemDef["category"], ItemDef[]]> =>
  (Object.keys(CATEGORY_LABEL) as ItemDef["category"][])
    .map((c) => [c, Object.values(ITEM_CATALOG).filter((i) => i.category === c)] as [ItemDef["category"], ItemDef[]])
    .filter(([, items]) => items.length > 0);

export const ShopPanel = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { coins, ownedItemIds } = usePlayerState();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Floor 3 Shop</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Coins className="size-4" aria-hidden /> {coins}
            </span>
          </DialogTitle>
          <DialogDescription>Buy items, then place them from Edit My Room.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-3">
          <div className="space-y-5">
            {groups().map(([category, items]) => (
              <section key={category}>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {CATEGORY_LABEL[category]}
                </h3>
                <ul className="space-y-2">
                  {items.map((item) => {
                    const owned = ownedItemIds.includes(item.id);
                    const affordable = coins >= item.price;
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {owned ? "In your inventory" : `${item.price} coins`}
                          </p>
                        </div>
                        {owned ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                            <Check className="size-4" aria-hidden /> Owned
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={!affordable}
                            onClick={() => playerActions.buy(item.id)}
                          >
                            Buy
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
