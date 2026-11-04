import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOODS, ROOMS } from "@/data/dorm";
import {
  effectiveFootprint,
  featuredForToday,
  isPlaceable,
  isShopItem,
  ITEM_CATALOG,
  MAIL_ITEM_IDS,
  ITEM_SETS,
  rarityFor,
  SET_BY_ID,
  SET_REWARD,
  setProgress,
  type ItemDef,
  type RarityTier,
} from "@/data/items";
import { STICKER_BY_ID } from "@/data/stickers";
import type { ItemThumb } from "@/lib/itemThumbs";
import {
  canAfford,
  playerActions,
  takeCompletedSets,
  useDevMode,
  usePlayerState,
} from "@/lib/playerStore";
import { CoinAmount } from "./CoinAmount";
import { PixelIcon, type PixelGlyph } from "./PixelIcon";
import { sfx } from "@/game/sounds";

const MY_ROOM = ROOMS[0]!;
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const pixelated: CSSProperties = { imageRendering: "pixelated" };

const CATEGORY_LABEL: Record<ItemDef["category"], string> = {
  furniture: "Furniture",
  companion: "Companions",
  wallpaper: "Wallpaper",
  poster: "Posters",
};

/* ---------------- pixel glyphs ---------------- */

const TAB_ICON: Record<ItemDef["category"], PixelGlyph> = {
  furniture: {
    color: "#6fbfb0",
    color2: "#3e8f82",
    icon: [
      "............",
      "............",
      "..XXXXXXXX..",
      ".XooooooooX.",
      ".Xo+ooooooX.",
      "XXooooooooXX",
      "XoXXXXXXXXoX",
      "XoaaaaaaaaoX",
      "XXXXXXXXXXXX",
      ".X........X.",
      "............",
      "............",
    ],
  },
  companion: STICKER_BY_ID["plant_care"]!,
  wallpaper: {
    color: "#e98d70",
    color2: "#f0c75e",
    icon: [
      "............",
      ".XXXXXXXXXX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XoaoaoaoaX.",
      ".XXXXXXXXXX.",
      "............",
      "............",
    ],
  },
  poster: {
    color: "#a47ed0",
    color2: "#f0c75e",
    icon: [
      "............",
      "XXXXXXXXXXXX",
      "X++++++++++X",
      "X+++++++aa+X",
      "X+++++++aa+X",
      "X++++o+++++X",
      "X+++ooo++++X",
      "X++ooooo+++X",
      "X+ooooooo++X",
      "XXXXXXXXXXXX",
      "............",
      "............",
    ],
  },
};

const COIN_GLYPH: PixelGlyph = {
  color: "#f0c75e",
  color2: "#c9a227",
  icon: [
    "..XXXX..",
    ".XooooX.",
    "Xo+oooaX",
    "Xo+oooaX",
    "XoooooaX",
    "XoooooaX",
    ".XaaaaX.",
    "..XXXX..",
  ],
};

/** Mo, the shopkeeper — same chunky construction as the player, with an apron */
const MO_GLYPH: PixelGlyph = {
  color: "#4a9b8e",
  color2: "#f0c75e",
  palette: { h: "#3b2a2a", s: "#e8b48a" },
  icon: [
    "....XXXXXX....",
    "...XhhhhhhX...",
    "..XhhhhhhhhX..",
    "..XhsssssshX..",
    "..XsXssssXsX..",
    "..XssssssssX..",
    "..XsssXXsssX..",
    "...XssssssX...",
    "..XXoXXXXoXX..",
    ".XooXaaaaXooX.",
    "XsoXaaaaaaXosX",
    "XsoXaa++aaXosX",
    ".XXXaaaaaaXXX.",
    "...XaaaaaaX...",
    "...XooXXooX...",
    "...XXX..XXX...",
  ],
};

/* ---------------- shopkeeper lines ---------------- */

export const SHOPKEEPER_LINES = {
  open: ["Fresh drop today.", "Disco ball's back in stock.", "Take your time. Touch everything."],
  premium: ["Ooh, big spender.", "That one's the good stuff."],
  purchase: ["Good pick.", `That'll look sick in ${MY_ROOM.roomNumber ?? "your room"}.`],
  cantAfford: ["Couple more dailies and it's yours.", "I'll hold it. Not literally."],
  setDone: ["Full set! Here's a little something."],
} as const;
type LineKind = keyof typeof SHOPKEEPER_LINES;

let lineCounter = 0;
const pickLine = (kind: LineKind) => {
  const pool = SHOPKEEPER_LINES[kind];
  return pool[lineCounter++ % pool.length]!;
};

/* ---------------- helpers ---------------- */

const TAG_BG: Record<RarityTier, string> = {
  standard: "bg-[var(--tag-standard)]",
  nice: "bg-[var(--tag-nice)]",
  premium: "bg-[var(--tag-premium)]",
};
const TIER_LABEL: Record<RarityTier, string> = { standard: "Standard", nice: "Nice", premium: "Premium" };

const INTERACTIVE_LINE: Record<NonNullable<ItemDef["interactive"]>, string> = {
  songs: "Opens your playlist",
  watching: "Shows what you're watching",
  bulletin: "Opens your bulletin board",
  art: "Click to view art",
  companion: "Says hi when you walk up",
};

const footprintLine = (item: ItemDef) => {
  if (item.category === "wallpaper") return "covers your back wall";
  const f = effectiveFootprint(item);
  return `${f.w}×${f.h} · ${item.mount === "wall" ? "hangs on wall" : "floor"}`;
};

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

/** "5h 12m" until local midnight — featured picks are day-based */
const useRestockCountdown = () => {
  const calc = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60_000));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };
  const [label, setLabel] = useState(calc);
  useEffect(() => {
    const id = window.setInterval(() => setLabel(calc()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return label;
};

/** draws a thumbnail at an integer art-pixel scale (textures are authored at 2 screen px per art px) */
const Sprite = ({
  thumb,
  item,
  max,
  big = false,
  hop = false,
}: {
  thumb?: ItemThumb | undefined;
  item: ItemDef;
  max: { w: number; h: number };
  big?: boolean;
  hop?: boolean;
}) => {
  if (!thumb)
    return (
      <span className="font-display text-[10px] uppercase tracking-widest text-panel-muted">
        {CATEGORY_LABEL[item.category]}
      </span>
    );
  const scales = big ? [2, 1, 0.5] : [1, 0.5];
  const scale = scales.find((s) => thumb.w * s <= max.w && thumb.h * s <= max.h) ?? 0.5;
  return (
    <img
      src={thumb.src}
      alt={item.name}
      width={thumb.w * scale}
      height={thumb.h * scale}
      style={{
        ...pixelated,
        width: thumb.w * scale,
        height: thumb.h * scale,
        animation: hop ? "shop-hop 180ms steps(3) 2 alternate" : undefined,
      }}
    />
  );
};

const PriceTag = ({
  item,
  owned,
  affordable,
  hanging = false,
}: {
  item: ItemDef;
  owned: boolean;
  affordable: boolean;
  hanging?: boolean;
}) => {
  const tier = rarityFor(item.price);
  return (
    <span className={`relative inline-flex flex-col items-center ${hanging ? "-rotate-3" : ""}`}>
      {hanging ? <span aria-hidden className="h-2 w-[2px] bg-ink" /> : null}
      <span
        className={`flex items-center gap-1 border-2 border-ink px-1.5 py-px font-body text-[11px] font-extrabold tabular-nums ${TAG_BG[tier]} ${
          owned || affordable ? "text-ink" : "text-[var(--tag-short)]"
        }`}
        title={`${TIER_LABEL[tier]} · ${item.price} coins`}
      >
        {owned ? (
          <Check className="size-3" aria-label="Owned" />
        ) : (
          <>
            <PixelIcon def={COIN_GLYPH} size={18} />
            {item.price}
          </>
        )}
      </span>
    </span>
  );
};

const SetBadge = ({ item }: { item: ItemDef }) =>
  item.set ? (
    <span className="max-w-full truncate border-2 border-ink bg-panel px-1 font-display text-[8px] font-bold uppercase leading-tight tracking-wider text-panel-foreground">
      {SET_BY_ID[item.set].name}
    </span>
  ) : null;

/* ---------------- shelf ---------------- */

const ShelfItem = ({
  item,
  thumb,
  owned,
  affordable,
  selected,
  hop,
  onSelect,
  onHoverPremium,
}: {
  item: ItemDef;
  thumb?: ItemThumb | undefined;
  owned: boolean;
  affordable: boolean;
  selected: boolean;
  hop: boolean;
  onSelect: () => void;
  onHoverPremium: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    onMouseEnter={() => {
      if (!owned && rarityFor(item.price) === "premium") onHoverPremium();
    }}
    aria-pressed={selected}
    className={`group relative flex flex-col items-stretch text-left ${selected ? "z-10" : ""}`}
  >
    <span className="absolute left-1 top-0 z-10 max-w-[70%]">
      <SetBadge item={item} />
    </span>
    <span
      className={`flex h-[104px] items-end justify-center px-1 pb-0.5 transition ${
        selected ? "bg-ink/10" : "group-hover:bg-ink/5"
      }`}
    >
      <Sprite thumb={thumb} item={item} max={{ w: 132, h: 96 }} hop={hop} />
    </span>
    <span aria-hidden className="shelf-plank h-3" />
    <span className="flex items-start justify-between gap-1 px-1.5">
      <span className="min-w-0 pt-1 font-display text-[11px] font-bold leading-tight text-panel-foreground">
        {item.name}
      </span>
      <PriceTag item={item} owned={owned} affordable={affordable} hanging />
    </span>
  </button>
);

const Shelf = ({
  items,
  render,
}: {
  items: ItemDef[];
  render: (i: ItemDef) => React.ReactNode;
}) => <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3">{items.map(render)}</div>;

/* ---------------- detail ---------------- */

const Detail = ({
  item,
  thumb,
  onClose,
  onBuy,
  onPlaceNow,
  justBought,
  hop,
}: {
  item: ItemDef;
  thumb?: ItemThumb | undefined;
  onClose: () => void;
  onBuy: (el: HTMLElement) => void;
  onPlaceNow: () => void;
  justBought: boolean;
  hop: boolean;
}) => {
  const { coins, ownedItemIds, roomLayout, myWallpaperId } = usePlayerState();
  const owned = ownedItemIds.includes(item.id);
  const affordable = canAfford(item.price);
  const tier = rarityFor(item.price);
  const mood = MOODS[MY_ROOM.mood];
  const wallColor = ITEM_CATALOG[myWallpaperId]?.wallColor ?? mood.wall;
  const isWall = item.mount === "wall";
  const isPaper = item.category === "wallpaper";
  const placed = roomLayout.some((p) => p.itemId === item.id);
  const prog = item.set ? setProgress(item.set, ownedItemIds) : null;

  // preview swatch: your current wall for wall items, your floor tile for floor items
  const swatch: CSSProperties = isPaper
    ? thumb
      ? { backgroundImage: `url(${thumb.src})`, backgroundSize: `${thumb.w * 2}px ${thumb.h * 2}px`, ...pixelated }
      : { backgroundColor: hex(item.wallColor ?? mood.wall) }
    : isWall
      ? {
          backgroundColor: hex(wallColor),
          boxShadow: `inset 0 -14px 0 0 ${hex(mood.wall)}, inset 0 -17px 0 0 var(--color-ink)`,
        }
      : {
          backgroundColor: hex(mood.wallpaper),
          backgroundImage: `linear-gradient(90deg, color-mix(in oklab, var(--color-ink) 12%, transparent) 2px, transparent 2px), linear-gradient(0deg, color-mix(in oklab, var(--color-ink) 12%, transparent) 2px, transparent 2px)`,
          backgroundSize: "32px 32px",
        };

  const btn =
    "w-full rounded-[3px] border-2 border-ink px-3 py-2 font-display text-sm font-bold transition disabled:cursor-default";
  let action: React.ReactNode;
  if (!owned) {
    action = affordable ? (
      <button
        type="button"
        className={`${btn} bg-ink text-panel hover:opacity-90`}
        onClick={(e) => onBuy(e.currentTarget)}
      >
        Buy · {item.price}
      </button>
    ) : (
      <button type="button" disabled className={`${btn} bg-panel text-[var(--tag-short)]`}>
        Need {item.price - coins} more
      </button>
    );
  } else if (isPaper) {
    action =
      myWallpaperId === item.id ? (
        <button type="button" disabled className={`${btn} bg-panel text-panel-muted`}>
          On your wall
        </button>
      ) : (
        <button
          type="button"
          className={`${btn} bg-ink text-panel hover:opacity-90`}
          onClick={() => playerActions.setWallpaper(item.id)}
        >
          Put it up
        </button>
      );
  } else if (placed) {
    action = (
      <button type="button" disabled className={`${btn} bg-panel text-panel-muted`}>
        In your room
      </button>
    );
  } else if (isPlaceable(item)) {
    action = (
      <button
        type="button"
        className={`${btn} bg-ink text-panel hover:opacity-90`}
        onClick={() => {
          sfx.uiClick();
          onPlaceNow();
        }}
      >
        {justBought ? "Place it now" : "Place it"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-tight text-panel-foreground">{item.name}</p>
          <p className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">
            {TIER_LABEL[tier]} · {CATEGORY_LABEL[item.category]}
          </p>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose} className="shrink-0 sm:hidden">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div
        className="relative flex h-[188px] items-end justify-center overflow-hidden border-[3px] border-ink pb-4"
        style={swatch}
      >
        {isPaper ? null : <Sprite thumb={thumb} item={item} max={{ w: 248, h: 160 }} big hop={hop} />}
        <span className="absolute right-2 top-2">
          <PriceTag item={item} owned={owned} affordable={affordable} />
        </span>
      </div>
      <p className="font-body text-sm italic leading-snug text-panel-foreground">{item.blurb}</p>
      <ul className="space-y-0.5 font-body text-xs text-panel-muted">
        <li>{footprintLine(item)}</li>
        {item.interactive ? <li>{INTERACTIVE_LINE[item.interactive]}</li> : null}
      </ul>
      {prog && item.set ? (
        <div>
          <div className="flex items-baseline justify-between font-display text-[11px] font-bold">
            <span className="text-panel-foreground">{SET_BY_ID[item.set].name}</span>
            <span className="tabular-nums text-panel-muted">
              {prog.owned}/{prog.total}
            </span>
          </div>
          <div className="mt-1 flex gap-[3px]">
            {Array.from({ length: prog.total }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 flex-1 border-2 border-ink ${i < prog.owned ? "bg-[var(--tag-premium)]" : ""}`}
              />
            ))}
          </div>
          <p className="mt-1 font-body text-[11px] text-panel-muted">
            {prog.owned === prog.total ? "Set complete" : `Own all ${prog.total} for +${SET_REWARD} coins`}
          </p>
        </div>
      ) : null}
      {action}
    </div>
  );
};

/* ---------------- coin burst ---------------- */

interface Burst {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/* ---------------- shop ---------------- */

export const ShopPanel = ({
  open,
  onOpenChange,
  thumbnails = {},
  onPlaceNow,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** tinted per-item thumbnails keyed by item id */
  thumbnails?: Record<string, ItemThumb>;
  onPlaceNow?: (itemId: string) => void;
}) => {
  const { coins, ownedItemIds } = usePlayerState();
  const devMode = useDevMode(); // re-render when unlimited flips
  const unlimited = devMode.enabled && devMode.unlimited;
  const shownCoins = useTickingNumber(coins);
  const restock = useRestockCountdown();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [bySet, setBySet] = useState(false);
  const [tab, setTab] = useState<ItemDef["category"]>("furniture");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const [hopId, setHopId] = useState<string | null>(null);
  const [line, setLine] = useState<string>(SHOPKEEPER_LINES.open[0]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);

  const featuredIds = useMemo(() => featuredForToday(), []);
  const featured = new Set(featuredIds);
  const all = Object.values(ITEM_CATALOG).filter(isShopItem);
  const ownedCount = all.filter((i) => ownedItemIds.includes(i.id)).length;
  const mailFound = MAIL_ITEM_IDS.filter((id) => ownedItemIds.includes(id)).length;
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    setLine(pickLine("open"));
    setJustBought(null);
  }, [open]);

  const say = (kind: LineKind) => setLine(pickLine(kind));

  const select = (item: ItemDef) => {
    sfx.uiClick();
    setSelectedId(item.id);
    if (!ownedItemIds.includes(item.id) && !canAfford(item.price)) say("cantAfford");
  };

  const buy = (item: ItemDef, from: HTMLElement) => {
    if (!playerActions.buy(item.id)) return; // plays purchase + coin sfx
    setJustBought(item.id);
    setHopId(item.id);
    window.setTimeout(() => setHopId(null), 400);
    say("purchase");
    // 4 pixel coins fly from the button to the coin counter
    const root = rootRef.current?.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = coinRef.current?.getBoundingClientRect();
    if (root && b) {
      const now = Date.now();
      const next = Array.from({ length: 4 }, (_, i) => {
        const x = a.left + a.width / 2 - root.left + (i - 1.5) * 10;
        const y = a.top - root.top;
        return { id: now + i, x, y, dx: b.left + b.width / 2 - root.left - x, dy: b.top + b.height / 2 - root.top - y };
      });
      setBursts((cur) => [...cur, ...next]);
      window.setTimeout(() => setBursts((cur) => cur.filter((c) => c.id < now)), 1000);
    }
    for (const setId of takeCompletedSets()) {
      const st = SET_BY_ID[setId as keyof typeof SET_BY_ID];
      if (!st) continue;
      toast.success(`${st.name} complete!`, { description: `+${SET_REWARD} coins for the full set` });
      say("setDone");
    }
  };

  const matches = (i: ItemDef) => !q || i.name.toLowerCase().includes(q);
  const sorted = (items: ItemDef[]) =>
    [...items].sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : Number(featured.has(b.id)) - Number(featured.has(a.id)),
    );
  const categories = (Object.keys(CATEGORY_LABEL) as ItemDef["category"][]).filter((c) =>
    all.some((i) => i.category === c),
  );

  const selected = selectedId ? ITEM_CATALOG[selectedId] : undefined;

  const renderShelfItem = (item: ItemDef) => (
    <ShelfItem
      key={item.id}
      item={item}
      thumb={thumbnails[item.id]}
      owned={ownedItemIds.includes(item.id)}
      affordable={canAfford(item.price)}
      selected={selectedId === item.id}
      hop={hopId === item.id}
      onSelect={() => select(item)}
      onHoverPremium={() => say("premium")}
    />
  );

  const [spot, ...sides] = featuredIds.map((id) => ITEM_CATALOG[id]).filter((i): i is ItemDef => !!i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="game-panel flex max-h-[90vh] w-full max-w-none flex-col gap-0 overflow-hidden border-0 bg-panel p-0 text-panel-foreground shadow-none sm:max-w-3xl max-sm:bottom-0 max-sm:top-auto max-sm:h-[94dvh] max-sm:max-h-[94dvh] max-sm:translate-y-0">
        <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
          {/* ---- banner ---- */}
          <div aria-hidden className="shop-awning h-5 shrink-0 border-b-[3px] border-ink" />
          <div className="flex shrink-0 items-end gap-3 border-b-[3px] border-ink px-4 pb-2 pt-2">
            <div className="flex items-end gap-2">
              <span style={{ animation: "mo-bob 900ms steps(2) infinite alternate" }} aria-hidden>
                <PixelIcon def={MO_GLYPH} size={36} />
              </span>
              <div className="relative mb-6 max-w-[180px] border-2 border-ink bg-panel px-2 py-1 font-body text-xs font-semibold text-panel-foreground">
                <span className="sr-only">Mo says: </span>
                {line}
                <span aria-hidden className="absolute -bottom-[7px] left-2 size-2.5 rotate-45 border-b-2 border-r-2 border-ink bg-panel" />
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1 pr-6">
              <DialogTitle className="border-[3px] border-ink bg-[var(--crate-wood)] px-3 py-1 font-display text-base font-bold tracking-widest text-[var(--tag-standard)] sm:text-lg">
                FLOOR 3 SUPPLY
              </DialogTitle>
              <DialogDescription className="sr-only">
                Buy furniture, companions, wallpaper and posters for your room. Today's drop rotates daily.
              </DialogDescription>
              <div className="flex items-center gap-2 font-body text-xs font-bold text-panel-foreground">
                <span ref={coinRef} className="flex items-center gap-1 border-2 border-ink bg-panel px-1.5 py-0.5">
                  <PixelIcon def={COIN_GLYPH} size={24} />
                  <CoinAmount value={unlimited ? coins : shownCoins} unlimited={unlimited} />
                </span>
                <span className="border-2 border-ink px-1.5 py-0.5 tabular-nums">
                  {ownedCount}/{all.length} owned
                </span>
                <span className="flex items-center gap-1 border-2 border-ink px-1.5 py-0.5 tabular-nums">
                  <span className="border border-ink bg-[var(--tag-premium)] px-0.5 font-display text-[8px] leading-none text-ink">
                    MAIL
                  </span>
                  Mail finds: {mailFound}/{MAIL_ITEM_IDS.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* ---- main ---- */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
              {spot ? (
                <section className="mb-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-panel-foreground">
                      Today's Drop
                    </h3>
                    <span className="font-body text-[11px] text-panel-muted">Restocks in {restock}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => select(spot)}
                      className="col-span-2 flex flex-col items-center border-[3px] border-ink bg-[var(--shop-floor)] p-2"
                    >
                      <span className="flex h-[136px] items-end">
                        <Sprite thumb={thumbnails[spot.id]} item={spot} max={{ w: 260, h: 132 }} big hop={hopId === spot.id} />
                      </span>
                      {/* pixel pedestal */}
                      <span aria-hidden className="h-2 w-3/5 border-2 border-ink bg-[var(--tag-premium)]" />
                      <span aria-hidden className="h-4 w-2/5 border-2 border-t-0 border-ink bg-[var(--crate-wood)]" />
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-panel-foreground">{spot.name}</span>
                        <PriceTag item={spot} owned={ownedItemIds.includes(spot.id)} affordable={canAfford(spot.price)} />
                      </span>
                    </button>
                    <div className="flex flex-col gap-2">
                      {sides.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => select(it)}
                          className="flex flex-1 flex-col items-center justify-end border-[3px] border-ink bg-[var(--shop-floor)] p-1.5"
                        >
                          <Sprite thumb={thumbnails[it.id]} item={it} max={{ w: 96, h: 52 }} hop={hopId === it.id} />
                          <span className="mt-1 flex w-full items-center justify-between gap-1">
                            <span className="truncate font-display text-[10px] font-bold text-panel-foreground">{it.name}</span>
                            <PriceTag item={it} owned={ownedItemIds.includes(it.id)} affordable={canAfford(it.price)} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <Tabs value={tab} onValueChange={(v) => setTab(v as ItemDef["category"])}>
                <TabsList className="h-auto w-full flex-wrap rounded-[3px] border-2 border-ink bg-panel-foreground/5">
                  {categories.map((c) => (
                    <TabsTrigger
                      key={c}
                      value={c}
                      onClick={() => sfx.uiClick()}
                      className="flex-1 gap-1.5 rounded-[2px] font-display text-xs font-bold"
                    >
                      <PixelIcon def={TAB_ICON[c]} size={24} />
                      {CATEGORY_LABEL[c]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="mb-3 mt-2 flex flex-wrap gap-2">
                  <div className="relative min-w-[140px] flex-1">
                    <Search
                      className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-panel-muted"
                      aria-hidden
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name"
                      className="h-8 w-full rounded-[3px] border-2 border-ink bg-panel pl-7 pr-2 font-body text-sm text-panel-foreground outline-none"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    aria-label="Sort items"
                    className="h-8 rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-xs text-panel-foreground"
                  >
                    <option value="featured">Featured first</option>
                    <option value="price-asc">Price: Low→High</option>
                    <option value="price-desc">Price: High→Low</option>
                  </select>
                  <button
                    type="button"
                    aria-pressed={bySet}
                    onClick={() => {
                      sfx.uiClick();
                      setBySet(!bySet);
                    }}
                    className={`h-8 rounded-[3px] border-2 border-ink px-2 font-display text-xs font-bold ${
                      bySet ? "bg-ink text-panel" : "bg-panel text-panel-foreground"
                    }`}
                  >
                    Sets
                  </button>
                </div>
                {categories.map((c) => {
                  const items = sorted(all.filter((i) => i.category === c && matches(i)));
                  return (
                    <TabsContent key={c} value={c} className="mt-0">
                      {items.length === 0 ? (
                        <p className="py-8 text-center font-body text-sm text-panel-muted">
                          Nothing matches "{query}".
                        </p>
                      ) : bySet ? (
                        <div className="space-y-5">
                          {ITEM_SETS.map((st) => {
                            const inSet = items.filter((i) => i.set === st.id);
                            if (!inSet.length) return null;
                            const p = setProgress(st.id, ownedItemIds);
                            return (
                              <section key={st.id}>
                                <h4 className="mb-1 font-display text-xs font-bold text-panel-foreground">
                                  {st.name}{" "}
                                  <span className="tabular-nums text-panel-muted">
                                    {p.owned}/{p.total}
                                  </span>
                                </h4>
                                <Shelf items={inSet} render={renderShelfItem} />
                              </section>
                            );
                          })}
                          {items.some((i) => !i.set) ? (
                            <section>
                              <h4 className="mb-1 font-display text-xs font-bold text-panel-muted">Everything else</h4>
                              <Shelf items={items.filter((i) => !i.set)} render={renderShelfItem} />
                            </section>
                          ) : null}
                        </div>
                      ) : (
                        <Shelf items={items} render={renderShelfItem} />
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>

            {/* ---- detail: side panel on desktop, bottom sheet on mobile ---- */}
            <aside
              className={`border-ink bg-panel sm:block sm:w-72 sm:shrink-0 sm:overflow-y-auto sm:border-l-[3px] max-sm:absolute max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-20 max-sm:max-h-[78%] max-sm:overflow-y-auto max-sm:border-t-[3px] ${
                selected ? "" : "max-sm:hidden"
              }`}
            >
              {selected ? (
                <Detail
                  item={selected}
                  thumb={thumbnails[selected.id]}
                  justBought={justBought === selected.id}
                  hop={hopId === selected.id}
                  onClose={() => setSelectedId(null)}
                  onBuy={(el) => buy(selected, el)}
                  onPlaceNow={() => onPlaceNow?.(selected.id)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <PixelIcon def={TAB_ICON[tab]} size={36} />
                  <p className="font-body text-sm text-panel-muted">Tap anything on the shelves for a closer look.</p>
                </div>
              )}
            </aside>
          </div>

          {/* flying coins */}
          {bursts.map((c, i) => (
            <span
              key={c.id}
              aria-hidden
              className="pointer-events-none absolute z-50"
              style={
                {
                  left: c.x,
                  top: c.y,
                  "--dx": `${c.dx}px`,
                  "--dy": `${c.dy}px`,
                  animation: `coin-fly 560ms steps(6) ${i % 4 * 70}ms both`,
                } as CSSProperties
              }
            >
              <PixelIcon def={COIN_GLYPH} size={24} />
            </span>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
