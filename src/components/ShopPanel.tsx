import { Check, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    .map(
      (c) =>
        [c, Object.values(ITEM_CATALOG).filter((i) => i.category === c)] as [
          ItemDef["category"],
          ItemDef[],
        ],
    )
    .filter(([, items]) => items.length > 0);

const ItemCard = ({
  item,
  owned,
  affordable,
  thumb,
}: {
  item: ItemDef;
  owned: boolean;
  affordable: boolean;
  thumb?: string;
}) => (
  <Card
    className={`relative gap-2 p-3 transition ${owned || affordable ? "" : "opacity-50"}`}
  >
    {owned ? (
      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" aria-hidden />
      </span>
    ) : null}
    <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-secondary">
      {thumb ? (
        <img
          src={thumb}
          alt={item.name}
          className="max-h-16 w-auto [image-rendering:pixelated]"
          loading="lazy"
        />
      ) : (
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {CATEGORY_LABEL[item.category]}
        </span>
      )}
    </div>
    <p className="text-center text-xs font-semibold text-foreground">{item.name}</p>
    {owned ? (
      <p className="text-center text-[11px] text-muted-foreground">In your inventory</p>
    ) : (
      <>
        <p className="flex items-center justify-center gap-1 text-xs font-bold text-primary">
          <Coins className="size-3.5" aria-hidden /> {item.price}
        </p>
        <Button
          size="sm"
          className="w-full"
          disabled={!affordable}
          onClick={() => playerActions.buy(item.id)}
        >
          Buy
        </Button>
      </>
    )}
  </Card>
);

export const ShopPanel = ({
  open,
  onOpenChange,
  thumbnails = {},
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  thumbnails?: Record<string, string>;
}) => {
  const { coins, ownedItemIds } = usePlayerState();
  const sections = groups();

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
        <Tabs defaultValue={sections[0]?.[0] ?? "furniture"}>
          <TabsList className="w-full">
            {sections.map(([category]) => (
              <TabsTrigger key={category} value={category} className="flex-1 text-xs">
                {CATEGORY_LABEL[category]}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map(([category, items]) => (
            <TabsContent key={category} value={category}>
              <ScrollArea className="h-[55vh] pr-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      owned={ownedItemIds.includes(item.id)}
                      affordable={coins >= item.price}
                      thumb={thumbnails[item.textureKey]}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
