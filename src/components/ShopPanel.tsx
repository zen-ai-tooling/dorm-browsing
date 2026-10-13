import { useEffect, useRef, useState } from "react";
import { Check, Coins, Crown, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { featuredForToday, ITEM_CATALOG, rarityFor, type ItemDef } from "@/data/items";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { IconChip } from "./GamePanel";
import { sfx } from "@/game/sounds";

const CATEGORY_LABEL: Record<ItemDef["category"], string> = {
  furniture: "Furniture",
  companion: "Companions",
  wallpaper: "Wallpaper",
  poster: "Posters",
};

type SortMode = "featured" | "price-asc" | "price-desc";

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

const TIER_CLASS = {
  standard: "",
  nice: "ring-2 ring-primary/40",
  premium: "ring-2 ring-accent shadow-[0_0_0_4px_var(--color-accent)]/30",
} as const;

/** animates an integer toward its target so coin changes visibly tick */
const useTickingNumber = (target: number) => {
  const [shown, setShown] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current;
    if (from === target) return;
    const start = performance.now();
    const dur = 450;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      ref.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
};

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
}) => {
  const [pop, setPop] = useState(false);
  const tier = rarityFor(item.price);
  return (
    <div
      onAnimationEnd={() => setPop(false)}
      className={`game-panel relative flex flex-col gap-2 p-3 transition ${TIER_CLASS[tier]} ${
        owned || affordable ? "" : "opacity-50"
      } ${pop ? "animate-[shop-pop_350ms_ease-out]" : ""}`}
    >
      {tier === "premium" ? (
        <span
          className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-[3px] border-2 border-ink bg-accent text-accent-foreground"
          title="Premium"
        >
          <Crown className="size-3" aria-hidden />
        </span>
      ) : null}
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
      <div>
        <p className="text-center font-display text-sm font-bold text-panel-foreground">{item.name}</p>
        <p className="mt-0.5 text-center font-body text-[11px] italic leading-snug text-panel-muted">
          {item.blurb}
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-2">
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
              onClick={() => {
                setPop(true);
                playerActions.buy(item.id); // plays purchase + coin sfx
              }}
            >
              Buy
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

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
  const shownCoins = useTickingNumber(coins);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("featured");
  const featured = new Set(featuredForToday());
  const all = Object.values(ITEM_CATALOG);
  const ownedCount = all.filter((i) => ownedItemIds.includes(i.id)).length;
  const q = query.trim().toLowerCase();

  const sections = groups().map(
    ([category, items]) =>
      [
        category,
        items
          .filter((i) => !q || i.name.toLowerCase().includes(q))
          .sort((a, b) =>
            sort === "price-asc"
              ? a.price - b.price
              : sort === "price-desc"
                ? b.price - a.price
                : Number(featured.has(b.id)) - Number(featured.has(a.id)),
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
              <span className="font-body tabular-nums">{shownCoins}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2 font-body text-panel-muted">
            <span>Buy items, then place them from Edit My Room. Featured picks rotate daily.</span>
            <span className="shrink-0 rounded-[3px] border-2 border-ink px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-panel-foreground">
              {ownedCount}/{all.length} owned
            </span>
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
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-panel-muted" aria-hidden />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    className="h-8 rounded-[3px] border-2 border-ink bg-panel pl-7 font-body text-sm"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  aria-label="Sort items"
                  className="h-8 rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-xs text-panel-foreground"
                >
                  <option value="featured">Featured first</option>
                  <option value="price-asc">Price: Low→High</option>
                  <option value="price-desc">Price: High→Low</option>
                </select>
              </div>
              <ScrollArea className="h-[50vh] pr-3">
                {items.length === 0 ? (
                  <p className="py-8 text-center font-body text-sm text-panel-muted">
                    Nothing matches "{query}".
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3">
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
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
