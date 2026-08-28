import { Check, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { featuredForToday, ITEM_CATALOG, type ItemDef } from "@/data/items";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { IconChip } from "./GamePanel";
import { sfx } from "@/game/sounds";

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
  featured = false,
}: {
  item: ItemDef;
  owned: boolean;
  affordable: boolean;
  thumb?: string | undefined;
  featured?: boolean;
}) => (
  <div
    className={`game-panel relative flex flex-col gap-2 p-3 transition ${
      owned || affordable ? "" : "opacity-50"
    }`}
  >
    {owned ? (
      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-[3px] border-2 border-ink bg-primary text-primary-foreground">
        <Check className="size-3" aria-hidden />
      </span>
    ) : null}
    {featured && !owned ? (
      <span className="absolute -left-1 -top-2 flex items-center gap-1 rounded-[3px] border-2 border-ink bg-accent px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
        <Sparkles className="size-2.5" aria-hidden />
        Featured
      </span>
    ) : null}
    <div className="flex h-20 items-center justify-center rounded-[3px] border-2 border-ink bg-panel-foreground/5">
      {thumb ? (
        <img
          src={thumb}
          alt={item.name}
          className="max-h-16 w-auto [image-rendering:pixelated]"
          loading="lazy"
        />
      ) : (
        <span className="font-display text-[11px] uppercase tracking-widest text-panel-muted">
          {CATEGORY_LABEL[item.category]}
        </span>
      )}
    </div>
    <p className="text-center font-display text-sm font-bold text-panel-foreground">{item.name}</p>
    {owned ? (
      <p className="text-center font-body text-[11px] text-panel-muted">In your inventory</p>
    ) : (
      <>
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-panel-foreground">
          <IconChip>
            <Coins className="size-3.5" aria-hidden />
          </IconChip>
          <span className="font-body tabular-nums">{item.price}</span>
        </p>
        <Button
          size="sm"
          className="w-full rounded-[3px] border-2 border-ink font-display font-bold"
          disabled={!affordable}
          onClick={() => playerActions.buy(item.id)}
        >
          Buy
        </Button>
      </>
    )}
  </div>
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
  const featured = new Set(featuredForToday());
  // today's featured picks float to the top of their own category tab
  const sections = groups().map(
    ([category, items]) =>
      [
        category,
        [...items].sort(
          (a, b) => Number(featured.has(b.id)) - Number(featured.has(a.id)),
        ),
      ] as [ItemDef["category"], ItemDef[]],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="game-panel max-w-lg border-0 bg-panel p-5 text-panel-foreground shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-7 font-display text-lg font-bold">
            <span>Floor 3 Shop</span>
            <span className="flex items-center gap-1.5 text-base font-bold text-panel-foreground">
              <IconChip>
                <Coins className="size-4" aria-hidden />
              </IconChip>
              <span className="font-body tabular-nums">{coins}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="font-body text-panel-muted">
            Buy items, then place them from Edit My Room. Featured picks rotate daily.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={sections[0]?.[0] ?? "furniture"}>
          <TabsList className="w-full rounded-[3px] border-2 border-ink bg-panel-foreground/5">
            {sections.map(([category]) => (
              <TabsTrigger
                key={category}
                value={category}
                onClick={() => sfx.uiClick()}
                className="flex-1 rounded-[2px] font-display text-xs font-bold"
              >
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
                      featured={featured.has(item.id)}
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
