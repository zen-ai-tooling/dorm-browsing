import type { ItemDef } from "./items";

/* ---------------------------------------------------------------
 * Avatar looks: plain data, no Phaser. The same look draws the player
 * in the world (textures.ts), the creator preview and shop thumbnails.
 * ------------------------------------------------------------- */

export const HAIR_STYLES = ["short", "long", "buzz", "curly", "bun", "bob"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

/** styles offered in the creator */
export const TOP_STYLES = ["tee", "stripe", "hoodie", "jacket"] as const;
/** shop outfits can also draw these */
export type TopStyle = (typeof TOP_STYLES)[number] | "varsity" | "overalls" | "bandtee" | "gown";

export const BOTTOM_STYLES = ["jeans", "shorts", "skirt", "joggers"] as const;
export type BottomStyle = (typeof BOTTOM_STYLES)[number];

export const ACCESSORIES = ["none", "glasses", "headphones", "beanie", "earrings"] as const;
export type Accessory = (typeof ACCESSORIES)[number] | "buckethat" | "gradcap";

export interface TopPiece {
  style: TopStyle;
  color: number;
}
export interface BottomPiece {
  style: BottomStyle;
  color: number;
}

export interface AvatarLook {
  /** index into SKIN_TONES (light → deep) */
  skin: number;
  hairStyle: HairStyle;
  /** index into HAIR_COLORS */
  hairColor: number;
  /** color: index into CLOTH_COLORS */
  top: TopPiece;
  bottom: BottomPiece;
  accessory: Accessory;
  /** a shop outfit that overrides top / bottom / accessory */
  outfitItemId?: string;
}

/** what an outfit item puts on you */
export interface OutfitDef {
  top: TopPiece;
  bottom: BottomPiece;
  accessory: Accessory;
}

/** [base, shade] — light → deep */
export const SKIN_TONES: Array<[number, number]> = [
  [0xf3d2b8, 0xd9ae92],
  [0xdfa982, 0xba8362],
  [0xc98e64, 0xa5704b],
  [0xa86f48, 0x875535],
  [0x7d4f32, 0x623b24],
  [0x56351f, 0x3f2616],
];

export const HAIR_COLOR_NAMES = ["black", "dark brown", "brown", "auburn", "blonde", "pink", "blue", "silver"] as const;
/** [base, highlight] in HAIR_COLOR_NAMES order */
export const HAIR_COLORS: Array<[number, number]> = [
  [0x2a2228, 0x45383f],
  [0x4a3745, 0x66495a],
  [0x7a5236, 0x9a6c48],
  [0x9c4a2e, 0xbd6640],
  [0xe0c072, 0xf2da98],
  [0xe58fb0, 0xf5b5cd],
  [0x5a7fc4, 0x82a3df],
  [0xb9b8c2, 0xdddce4],
];

/** 10-color clothing palette: [base, shade, highlight] */
export const CLOTH_COLORS: Array<[number, number, number]> = [
  [0x6c9aa2, 0x4c757d, 0x8ab6bd], // teal
  [0x4a5468, 0x373f51, 0x67718a], // navy
  [0xc8574a, 0x9c3f35, 0xe07a6c], // red
  [0xd9a842, 0xb0852b, 0xedc56a], // mustard
  [0x6f9a5f, 0x53773f, 0x8fb877], // green
  [0x8b6b9c, 0x6a5079, 0xa98bba], // plum
  [0xe8dcc6, 0xc9bba1, 0xf6eedd], // cream
  [0x3d3a44, 0x2a2830, 0x58545f], // charcoal
  [0xe8a0b4, 0xc77d93, 0xf5c1d0], // pink
  [0x8fbfe0, 0x6c9cbf, 0xb3d6ef], // sky
];

/** the look every player had before avatars existed — older saves keep it */
export const DEFAULT_LOOK: AvatarLook = {
  skin: 1,
  hairStyle: "short",
  hairColor: 1,
  top: { style: "tee", color: 0 },
  bottom: { style: "jeans", color: 1 },
  accessory: "none",
};

export const NAME_MAX = 16;

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length) % list.length]!;

/** a fresh random look from the creator's options (outfits never roll) */
export const randomLook = (rand: () => number = Math.random): AvatarLook => {
  const top = Math.floor(rand() * CLOTH_COLORS.length) % CLOTH_COLORS.length;
  let bottom = Math.floor(rand() * CLOTH_COLORS.length) % CLOTH_COLORS.length;
  if (bottom === top) bottom = (bottom + 3) % CLOTH_COLORS.length; // keep top and bottom readable
  return {
    skin: Math.floor(rand() * SKIN_TONES.length) % SKIN_TONES.length,
    hairStyle: pick(HAIR_STYLES, rand),
    hairColor: Math.floor(rand() * HAIR_COLORS.length) % HAIR_COLORS.length,
    top: { style: pick(TOP_STYLES, rand), color: top },
    bottom: { style: pick(BOTTOM_STYLES, rand), color: bottom },
    // most people go accessory-free
    accessory: rand() < 0.45 ? "none" : pick(ACCESSORIES.slice(1), rand),
  };
};

const ALL_TOPS: readonly string[] = [...TOP_STYLES, "varsity", "overalls", "bandtee", "gown"];
const ALL_ACCESSORIES: readonly string[] = [...ACCESSORIES, "buckethat", "gradcap"];
const index = (v: unknown, n: number, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < n ? v : fallback;

/** validates a saved look field by field; anything broken falls back to `fallback` */
export const normalizeAvatar = (raw: unknown, fallback: AvatarLook = DEFAULT_LOOK): AvatarLook => {
  if (!raw || typeof raw !== "object") return { ...fallback, top: { ...fallback.top }, bottom: { ...fallback.bottom } };
  const r = raw as Partial<Record<keyof AvatarLook, unknown>>;
  const top = (r.top ?? {}) as { style?: unknown; color?: unknown };
  const bottom = (r.bottom ?? {}) as { style?: unknown; color?: unknown };
  const out: AvatarLook = {
    skin: index(r.skin, SKIN_TONES.length, fallback.skin),
    hairStyle: (HAIR_STYLES as readonly string[]).includes(r.hairStyle as string)
      ? (r.hairStyle as HairStyle)
      : fallback.hairStyle,
    hairColor: index(r.hairColor, HAIR_COLORS.length, fallback.hairColor),
    top: {
      style: ALL_TOPS.includes(top.style as string) ? (top.style as TopStyle) : fallback.top.style,
      color: index(top.color, CLOTH_COLORS.length, fallback.top.color),
    },
    bottom: {
      style: (BOTTOM_STYLES as readonly string[]).includes(bottom.style as string)
        ? (bottom.style as BottomStyle)
        : fallback.bottom.style,
      color: index(bottom.color, CLOTH_COLORS.length, fallback.bottom.color),
    },
    accessory: ALL_ACCESSORIES.includes(r.accessory as string) ? (r.accessory as Accessory) : fallback.accessory,
  };
  if (typeof r.outfitItemId === "string") out.outfitItemId = r.outfitItemId;
  return out;
};

/** the look actually drawn: a worn outfit replaces top, bottom and accessory */
export const effectiveLook = (look: AvatarLook, catalog: Record<string, ItemDef>): AvatarLook => {
  const outfit = look.outfitItemId ? catalog[look.outfitItemId]?.outfit : undefined;
  if (!outfit) {
    const { outfitItemId: _drop, ...rest } = look;
    void _drop;
    return rest;
  }
  return {
    skin: look.skin,
    hairStyle: look.hairStyle,
    hairColor: look.hairColor,
    top: { ...outfit.top },
    bottom: { ...outfit.bottom },
    accessory: outfit.accessory,
  };
};

/** stable short id for a drawn look — part of its texture keys */
export const lookHash = (look: AvatarLook): string => {
  const s = [
    look.skin,
    look.hairStyle,
    look.hairColor,
    look.top.style,
    look.top.color,
    look.bottom.style,
    look.bottom.color,
    look.accessory,
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

/** display name of Your Room — the room id and ROOMS[0].name never change */
export const roomNameFor = (playerName: string) => {
  const n = playerName.trim();
  return n ? `${n}'s Room` : "Your Room";
};

export const cleanName = (raw: unknown) =>
  typeof raw === "string" ? raw.replace(/\s+/g, " ").trimStart().slice(0, NAME_MAX) : "";
