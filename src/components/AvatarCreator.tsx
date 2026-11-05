import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Dices } from "lucide-react";
import {
  ACCESSORIES,
  BOTTOM_STYLES,
  CLOTH_COLORS,
  HAIR_COLORS,
  HAIR_COLOR_NAMES,
  HAIR_STYLES,
  NAME_MAX,
  randomLook,
  SKIN_TONES,
  TOP_STYLES,
  effectiveLook,
  type AvatarLook,
} from "@/data/avatar";
import { ITEM_CATALOG, OUTFIT_ITEM_IDS } from "@/data/items";
import { avatarDataUrl } from "@/lib/avatarCanvas";
import { DIRS } from "@/game/avatarDraw";
import { sfx } from "@/game/sounds";
import { IconChip } from "./GamePanel";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const pixelated: CSSProperties = { imageRendering: "pixelated" };

type Tab = "skin" | "hair" | "top" | "bottom" | "extra" | "outfits";
const TAB_LABEL: Record<Tab, string> = {
  skin: "Skin",
  hair: "Hair",
  top: "Top",
  bottom: "Bottom",
  extra: "Extra",
  outfits: "Outfits",
};

const LABEL: Record<string, string> = {
  short: "Short",
  long: "Long",
  buzz: "Buzz",
  curly: "Curly",
  bun: "Bun",
  bob: "Bob",
  tee: "Tee",
  stripe: "Stripe",
  hoodie: "Hoodie",
  jacket: "Jacket",
  jeans: "Jeans",
  shorts: "Shorts",
  skirt: "Skirt",
  joggers: "Joggers",
  none: "None",
  glasses: "Glasses",
  headphones: "Headphones",
  beanie: "Beanie",
  earrings: "Earrings",
};

/** a square pixel colour swatch */
const Swatch = ({ color, on, label, onClick }: { color: number; on: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={on}
    title={label}
    onClick={onClick}
    className={`size-7 border-[3px] ${on ? "border-ink outline outline-2 outline-offset-1 outline-ink" : "border-ink/60"}`}
    style={{ backgroundColor: hex(color) }}
  />
);

/** a chip showing a tiny avatar wearing the option */
const LookChip = ({
  look,
  label,
  on,
  onClick,
  crop = false,
}: {
  look: AvatarLook;
  label: string;
  on: boolean;
  onClick: () => void;
  crop?: boolean;
}) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 border-2 border-ink px-1 pb-0.5 pt-1 ${
      on ? "bg-ink text-panel" : "bg-panel text-panel-foreground hover:bg-panel-foreground/10"
    }`}
  >
    <span className={`block overflow-hidden ${crop ? "h-[26px]" : "h-[42px]"}`}>
      <img src={avatarDataUrl(look, "down", 0, 2)} alt="" width={32} height={42} style={pixelated} />
    </span>
    <span className="font-display text-[9px] font-bold uppercase leading-none">{label}</span>
  </button>
);

const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap gap-1.5">{children}</div>;

/**
 * The avatar creator: big rotating ×6 preview, pixel option chips per tab, Randomize.
 * Changes are reported live through onChange (the world sprite swaps right away).
 */
export const AvatarCreator = ({
  look,
  onChange,
  name,
  onNameChange,
  ownedItemIds,
  footer,
  compact = false,
}: {
  look: AvatarLook;
  onChange: (look: AvatarLook) => void;
  name?: string;
  onNameChange?: (name: string) => void;
  ownedItemIds: string[];
  footer?: ReactNode;
  compact?: boolean;
}) => {
  const [tab, setTab] = useState<Tab>("skin");
  const [dirIdx, setDirIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const ownedOutfits = OUTFIT_ITEM_IDS.filter((id) => ownedItemIds.includes(id));
  const tabs: Tab[] = ownedOutfits.length
    ? ["skin", "hair", "top", "bottom", "extra", "outfits"]
    : ["skin", "hair", "top", "bottom", "extra"];

  // slow turntable through the 4 directions; manual arrows pause it for a bit
  useEffect(() => {
    if (paused) {
      const t = window.setTimeout(() => setPaused(false), 4000);
      return () => window.clearTimeout(t);
    }
    const id = window.setInterval(() => setDirIdx((i) => (i + 1) % 4), 1400);
    return () => window.clearInterval(id);
  }, [paused]);

  const dir = DIRS[dirIdx]!;
  const preview = useMemo(() => avatarDataUrl(look, dir, 0, 6), [look, dir]);
  const drawn = effectiveLook(look, ITEM_CATALOG);
  const wearing = look.outfitItemId && ITEM_CATALOG[look.outfitItemId]?.outfit ? look.outfitItemId : null;

  const tap = () => sfx.uiClick();
  /** editing your own pieces takes a worn outfit off so the change is visible */
  const own = (next: Partial<AvatarLook>) => {
    tap();
    const { outfitItemId: _o, ...rest } = look;
    void _o;
    onChange({ ...rest, ...next });
  };
  const turn = (by: number) => {
    tap();
    setPaused(true);
    setDirIdx((i) => (i + by + 4) % 4);
  };
  const bare = { ...drawn, accessory: "none" as const };
  const { outfitItemId: _w, ...bareLook } = look;
  void _w;

  return (
    <div className={`flex gap-3 ${compact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"}`}>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative flex h-[144px] w-[120px] items-end justify-center border-[3px] border-ink bg-[var(--shop-floor)]">
          <img src={preview} alt="Your avatar" width={96} height={126} style={pixelated} />
          <button
            type="button"
            aria-label="Turn left"
            onClick={() => turn(-1)}
            className="absolute left-0.5 top-1/2 -translate-y-1/2"
          >
            <IconChip>
              <ChevronLeft className="size-3.5" aria-hidden />
            </IconChip>
          </button>
          <button
            type="button"
            aria-label="Turn right"
            onClick={() => turn(1)}
            className="absolute right-0.5 top-1/2 -translate-y-1/2"
          >
            <IconChip>
              <ChevronRight className="size-3.5" aria-hidden />
            </IconChip>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            sfx.uiClick();
            onChange(randomLook());
          }}
          className="flex w-[120px] items-center justify-center gap-1.5 rounded-[3px] border-2 border-ink bg-panel px-2 py-1 font-display text-xs font-bold text-panel-foreground hover:bg-panel-foreground/10"
        >
          <Dices className="size-3.5" aria-hidden />
          Randomize
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {onNameChange ? (
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">
              Your name
            </span>
            <input
              value={name ?? ""}
              maxLength={NAME_MAX}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Alex"
              className="mt-0.5 h-8 w-full rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-sm text-panel-foreground outline-none"
            />
          </label>
        ) : null}

        <div role="tablist" className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                tap();
                setTab(t);
              }}
              className={`border-2 border-ink px-1.5 py-0.5 font-display text-[10px] font-bold uppercase ${
                tab === t ? "bg-ink text-panel" : "bg-panel text-panel-foreground"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {tab === "skin" ? (
            <Row>
              {SKIN_TONES.map(([c], i) => (
                <Swatch key={i} color={c} on={look.skin === i} label={`Skin tone ${i + 1}`} onClick={() => {
                  tap();
                  onChange({ ...look, skin: i });
                }} />
              ))}
            </Row>
          ) : null}

          {tab === "hair" ? (
            <>
              <Row>
                {HAIR_STYLES.map((h) => (
                  <LookChip
                    key={h}
                    crop
                    look={{ ...bare, hairStyle: h }}
                    label={LABEL[h]!}
                    on={look.hairStyle === h}
                    onClick={() => {
                      tap();
                      onChange({ ...look, hairStyle: h });
                    }}
                  />
                ))}
              </Row>
              <Row>
                {HAIR_COLORS.map(([c], i) => (
                  <Swatch key={i} color={c} on={look.hairColor === i} label={HAIR_COLOR_NAMES[i]!} onClick={() => {
                    tap();
                    onChange({ ...look, hairColor: i });
                  }} />
                ))}
              </Row>
            </>
          ) : null}

          {tab === "top" ? (
            <>
              <Row>
                {TOP_STYLES.map((s) => (
                  <LookChip
                    key={s}
                    look={{ ...bare, top: { style: s, color: look.top.color } }}
                    label={LABEL[s]!}
                    on={!wearing && look.top.style === s}
                    onClick={() => own({ top: { style: s, color: look.top.color } })}
                  />
                ))}
              </Row>
              <Row>
                {CLOTH_COLORS.map(([c], i) => (
                  <Swatch key={i} color={c} on={!wearing && look.top.color === i} label={`Top colour ${i + 1}`} onClick={() => own({ top: { style: look.top.style, color: i } })} />
                ))}
              </Row>
            </>
          ) : null}

          {tab === "bottom" ? (
            <>
              <Row>
                {BOTTOM_STYLES.map((s) => (
                  <LookChip
                    key={s}
                    look={{ ...bare, bottom: { style: s, color: look.bottom.color } }}
                    label={LABEL[s]!}
                    on={!wearing && look.bottom.style === s}
                    onClick={() => own({ bottom: { style: s, color: look.bottom.color } })}
                  />
                ))}
              </Row>
              <Row>
                {CLOTH_COLORS.map(([c], i) => (
                  <Swatch key={i} color={c} on={!wearing && look.bottom.color === i} label={`Bottom colour ${i + 1}`} onClick={() => own({ bottom: { style: look.bottom.style, color: i } })} />
                ))}
              </Row>
            </>
          ) : null}

          {tab === "extra" ? (
            <Row>
              {ACCESSORIES.map((a) => (
                <LookChip
                  key={a}
                  crop
                  look={{ ...drawn, accessory: a }}
                  label={LABEL[a]!}
                  on={!wearing && look.accessory === a}
                  onClick={() => own({ accessory: a })}
                />
              ))}
            </Row>
          ) : null}

          {tab === "outfits" ? (
            <Row>
              <LookChip
                look={bareLook}
                label="None"
                on={!wearing}
                onClick={() => own({})}
              />
              {ownedOutfits.map((id) => (
                <LookChip
                  key={id}
                  look={{ ...look, outfitItemId: id }}
                  label={ITEM_CATALOG[id]!.name.split(" ")[0]!}
                  on={wearing === id}
                  onClick={() => {
                    tap();
                    onChange({ ...look, outfitItemId: id });
                  }}
                />
              ))}
            </Row>
          ) : null}
        </div>
        {footer}
      </div>
    </div>
  );
};
