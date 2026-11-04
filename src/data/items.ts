import { MOODS, type MoodKey } from "./dorm";

export interface ItemDef {
  id: string;
  name: string;
  /** one line of shop flavor text */
  blurb: string;
  category: "furniture" | "wallpaper" | "poster" | "companion";
  /** matches a texture key generated in game/textures.ts */
  textureKey: string;
  /** tile footprint, used for grid snapping and overlap prevention */
  footprint: { w: number; h: number };
  solid: boolean;
  /** "wall" items hang on the back-wall face (row 0); default "floor" */
  mount?: "wall" | "floor";
  /** which popup this triggers, if any */
  interactive?: "songs" | "bulletin" | "companion" | "watching" | "art";
  /** wallpaper items only: the wall base colour applied when equipped */
  wallColor?: number;
  /** wallpaper items only: pattern drawn over the wall base */
  wallPattern?: "flat" | "stripes" | "checker" | "botanical" | "night" | "graph" | "sunset";
  /** optional recolor applied to the (neutral-authored) texture */
  tint?: number;
  /** collection set this item belongs to (at most one) — assigned from ITEM_SETS below */
  set?: SetId;
  /** night light source when placed — assigned from ITEM_LIGHTS below */
  light?: { color: number; radius: number; flicker?: boolean };
  /** coin cost in the shop; 0 for starter items */
  price: number;
  unlockedByDefault: boolean;
}

export const ITEM_CATALOG: Record<string, ItemDef> = {
  bed_basic: {
    blurb: "Squeaks a little. Holds secrets a lot.",
    id: "bed_basic",
    name: "Basic Bed",
    category: "furniture",
    textureKey: "bed",
    footprint: { w: 3, h: 2 },
    solid: true,
    price: 0,
    unlockedByDefault: true,
  },
  desk_basic: {
    blurb: "Where essays go to be started at 2am.",
    id: "desk_basic",
    name: "Basic Desk",
    category: "furniture",
    textureKey: "desk",
    footprint: { w: 3, h: 2 },
    solid: true,
    price: 0,
    unlockedByDefault: true,
  },
  speaker_basic: {
    blurb: "Small box, big opinions about bass.",
    id: "speaker_basic",
    name: "Speaker",
    category: "furniture",
    textureKey: "speaker",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "songs",
    price: 0,
    unlockedByDefault: true,
  },
  board_basic: {
    blurb: "Pin it or it didn't happen.",
    id: "board_basic",
    name: "Bulletin Board",
    category: "furniture",
    mount: "wall",
    textureKey: "board",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "bulletin",
    price: 0,
    unlockedByDefault: true,
  },
  plant_basic: {
    blurb: "Low-maintenance, high standards.",
    id: "plant_basic",
    name: "Potted Plant",
    category: "companion",
    textureKey: "plant",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 0,
    unlockedByDefault: true,
  },
  pet_cat_basic: {
    blurb: "Will sit on your keyboard mid-sentence.",
    id: "pet_cat_basic",
    name: "Cat",
    category: "companion",
    textureKey: "pet",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 0,
    unlockedByDefault: true,
  },
  tv_basic: {
    blurb: "Autoplay's most loyal enabler.",
    id: "tv_basic",
    name: "TV",
    category: "furniture",
    textureKey: "tv",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "watching",
    price: 0,
    unlockedByDefault: true,
  },
  poster_default: {
    blurb: "Proof you have taste. Allegedly.",
    id: "poster_default",
    name: "Wall Poster",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 0,
    unlockedByDefault: true,
  },
  rug_woven: {
    blurb: "Ties the room together, man.",
    id: "rug_woven",
    name: "Woven Rug",
    category: "furniture",
    textureKey: "rug",
    footprint: { w: 5, h: 3 },
    solid: false,
    price: 0,
    unlockedByDefault: true,
  },

  // ---- shop inventory (locked by default) ----
  bed_loft: {
    blurb: "Sleep up top, chaos underneath.",
    id: "bed_loft",
    name: "Lofted Bed",
    category: "furniture",
    textureKey: "bed",
    footprint: { w: 3, h: 2 },
    solid: true,
    tint: 0xb9c9e0,
    price: 60,
    unlockedByDefault: false,
  },
  rug_shag: {
    blurb: "Shag carpet, zero regrets.",
    id: "rug_shag",
    name: "Shag Rug",
    category: "furniture",
    textureKey: "rug",
    footprint: { w: 5, h: 3 },
    solid: false,
    tint: 0xe8a978,
    price: 35,
    unlockedByDefault: false,
  },
  chair_lounge: {
    blurb: "Seats three, naps one.",
    id: "chair_lounge",
    name: "Lounge Couch",
    category: "furniture",
    textureKey: "couch",
    footprint: { w: 4, h: 2 },
    solid: true,
    tint: 0x7fb0b3,
    price: 55,
    unlockedByDefault: false,
  },
  shelf_books: {
    blurb: "Half read, fully displayed.",
    id: "shelf_books",
    name: "Book Shelf",
    category: "furniture",
    textureKey: "shelf",
    footprint: { w: 3, h: 2 },
    solid: true,
    price: 45,
    unlockedByDefault: false,
  },
  record_player: {
    blurb: "Vinyl sounds warmer. You'll tell everyone.",
    id: "record_player",
    name: "Record Player",
    category: "furniture",
    textureKey: "record",
    footprint: { w: 2, h: 2 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  pet_dog: {
    blurb: "Good boy. Questionable hygiene.",
    id: "pet_dog",
    name: "Scruffy Dog",
    category: "companion",
    textureKey: "pet",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    tint: 0xd9c08a,
    price: 70,
    unlockedByDefault: false,
  },
  wallpaper_sunset: {
    blurb: "Golden hour, all hours.",
    id: "wallpaper_sunset",
    wallColor: 0xe0a87c,
    wallPattern: "sunset",
    name: "Sunset Wallpaper",
    category: "wallpaper",
    textureKey: "wallpaper_sunset",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 40,
    unlockedByDefault: false,
  },
  poster_gig: {
    blurb: "You were there. Probably.",
    id: "poster_gig",
    name: "Gig Poster",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-band",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 25,
    unlockedByDefault: false,
  },

  // ---- iteration 14: speaker + TV variants (functionally identical, visually distinct) ----
  speaker_boombox: {
    blurb: "Shoulder not included.",
    id: "speaker_boombox",
    name: "Retro Boombox",
    category: "furniture",
    textureKey: "boombox",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "songs",
    price: 45,
    unlockedByDefault: false,
  },
  speaker_tower: {
    blurb: "Tall, dark, and loud.",
    id: "speaker_tower",
    name: "Tower Speaker",
    category: "furniture",
    textureKey: "tower",
    footprint: { w: 1, h: 3 },
    solid: true,
    interactive: "songs",
    price: 65,
    unlockedByDefault: false,
  },
  speaker_vintage: {
    blurb: "Brass knobs, warm hiss, grown-up energy.",
    id: "speaker_vintage",
    name: "Vintage Hi-Fi Cabinet",
    category: "furniture",
    textureKey: "hifi",
    footprint: { w: 2, h: 2 },
    solid: true,
    interactive: "songs",
    price: 105,
    unlockedByDefault: false,
  },
  tv_crt: {
    blurb: "Static included at no extra charge.",
    id: "tv_crt",
    name: "Retro CRT TV",
    category: "furniture",
    textureKey: "crt",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "watching",
    price: 40,
    unlockedByDefault: false,
  },
  tv_mounted: {
    blurb: "For people who own a wall anchor.",
    id: "tv_mounted",
    name: "Mounted Flatscreen + Soundbar",
    category: "furniture",
    textureKey: "flatscreen",
    footprint: { w: 3, h: 2 },
    solid: false,
    interactive: "watching",
    price: 120,
    unlockedByDefault: false,
  },
  tv_gaming: {
    blurb: "Just one more match. Again.",
    id: "tv_gaming",
    name: "Gaming TV Setup",
    category: "furniture",
    textureKey: "tvgaming",
    footprint: { w: 3, h: 2 },
    solid: true,
    interactive: "watching",
    price: 95,
    unlockedByDefault: false,
  },

  // ---- iteration 13: catalog expansion ----
  lava_lamp: {
    blurb: "Blobs rise. Worries sink.",
    id: "lava_lamp",
    name: "Lava Lamp",
    category: "furniture",
    textureKey: "lavalamp",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  disco_ball: {
    blurb: "Every Tuesday is Friday now.",
    id: "disco_ball",
    name: "Mini Disco Ball",
    category: "furniture",
    textureKey: "discoball",
    footprint: { w: 1, h: 2 },
    solid: false,
    tint: 0xc9d6ec,
    price: 95,
    unlockedByDefault: false,
  },
  arcade_cabinet: {
    blurb: "Your high score, your rules.",
    id: "arcade_cabinet",
    name: "Tabletop Arcade",
    category: "furniture",
    textureKey: "arcade",
    footprint: { w: 2, h: 3 },
    solid: true,
    price: 110,
    unlockedByDefault: false,
  },
  hammock_chair: {
    blurb: "Gently swaying away from deadlines.",
    id: "hammock_chair",
    name: "Hammock Chair",
    category: "furniture",
    textureKey: "hammock",
    footprint: { w: 2, h: 3 },
    solid: false,
    price: 75,
    unlockedByDefault: false,
  },
  neon_sign: {
    blurb: "Says it so you don't have to.",
    id: "neon_sign",
    name: "Neon 'Vibes' Sign",
    category: "furniture",
    mount: "wall",
    textureKey: "neon",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 65,
    unlockedByDefault: false,
  },
  papasan_chair: {
    blurb: "Sink in. Never leave.",
    id: "papasan_chair",
    name: "Papasan Chair",
    category: "furniture",
    textureKey: "papasan",
    footprint: { w: 3, h: 2 },
    solid: true,
    price: 70,
    unlockedByDefault: false,
  },
  vinyl_crate: {
    blurb: "Alphabetized by mood.",
    id: "vinyl_crate",
    name: "Vinyl Crate Shelf",
    category: "furniture",
    textureKey: "vinylcrate",
    footprint: { w: 2, h: 2 },
    solid: true,
    price: 40,
    unlockedByDefault: false,
  },
  projector_screen: {
    blurb: "Movie night, wall-sized.",
    id: "projector_screen",
    name: "Projector + Screen",
    category: "furniture",
    textureKey: "projector",
    footprint: { w: 3, h: 2 },
    solid: true,
    price: 90,
    unlockedByDefault: false,
  },
  bed_canopy: {
    blurb: "Royalty, but with a meal plan.",
    id: "bed_canopy",
    name: "Canopy Bed",
    category: "furniture",
    textureKey: "canopybed",
    footprint: { w: 4, h: 3 },
    solid: true,
    price: 140,
    unlockedByDefault: false,
  },
  cushion_stack: {
    blurb: "Instant seating for surprise guests.",
    id: "cushion_stack",
    name: "Floor Cushion Stack",
    category: "furniture",
    textureKey: "cushions",
    footprint: { w: 2, h: 2 },
    solid: false,
    price: 20,
    unlockedByDefault: false,
  },

  pet_hamster: {
    blurb: "Runs marathons at 3am. Every night.",
    id: "pet_hamster",
    name: "Hamster + Wheel",
    category: "companion",
    textureKey: "hamster",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 45,
    unlockedByDefault: false,
  },
  pet_betta: {
    blurb: "Fancy fins, firm boundaries.",
    id: "pet_betta",
    name: "Betta Fish",
    category: "companion",
    textureKey: "betta",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 35,
    unlockedByDefault: false,
  },
  pet_axolotl: {
    blurb: "Permanently smiling. Unbothered.",
    id: "pet_axolotl",
    name: "Axolotl Tank",
    category: "companion",
    textureKey: "axolotl",
    footprint: { w: 3, h: 2 },
    solid: false,
    interactive: "companion",
    price: 120,
    unlockedByDefault: false,
  },
  pet_corgi: {
    blurb: "Short legs, enormous personality.",
    id: "pet_corgi",
    name: "Corgi",
    category: "companion",
    textureKey: "corgi",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 85,
    unlockedByDefault: false,
  },
  plant_bonsai: {
    blurb: "Patience, in pot form.",
    id: "plant_bonsai",
    name: "Bonsai Tree",
    category: "companion",
    textureKey: "bonsai",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "companion",
    price: 50,
    unlockedByDefault: false,
  },

  wallpaper_stripes: {
    blurb: "Soft lines, softer vibes.",
    id: "wallpaper_stripes",
    wallColor: 0xe9d6e2,
    wallPattern: "stripes",
    name: "Pastel Stripes",
    category: "wallpaper",
    textureKey: "wallpaper_stripes",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 40,
    unlockedByDefault: false,
  },
  wallpaper_checker: {
    blurb: "A diner booth you can live in.",
    id: "wallpaper_checker",
    wallColor: 0xdccfb6,
    wallPattern: "checker",
    name: "Retro Checkerboard",
    category: "wallpaper",
    textureKey: "wallpaper_checker",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 45,
    unlockedByDefault: false,
  },
  wallpaper_botanical: {
    blurb: "A jungle that never needs watering.",
    id: "wallpaper_botanical",
    wallColor: 0xd8dfc9,
    wallPattern: "botanical",
    name: "Botanical Leaf Print",
    category: "wallpaper",
    textureKey: "wallpaper_botanical",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 45,
    unlockedByDefault: false,
  },
  wallpaper_night: {
    blurb: "Stargazing without the cold.",
    id: "wallpaper_night",
    wallColor: 0x3b4468,
    wallPattern: "night",
    name: "Night Sky",
    category: "wallpaper",
    textureKey: "wallpaper_night",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 55,
    unlockedByDefault: false,
  },
  wallpaper_graph: {
    blurb: "For people who plot things. Literally.",
    id: "wallpaper_graph",
    wallColor: 0xdfe6da,
    wallPattern: "graph",
    name: "Graph Paper Grid",
    category: "wallpaper",
    textureKey: "wallpaper_graph",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },

  poster_tour: {
    blurb: "Twelve cities. One very good summer.",
    id: "poster_tour",
    name: "Band Tour Poster",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-tour",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 25,
    unlockedByDefault: false,
  },
  poster_travel: {
    blurb: "Somewhere you'll go. Eventually.",
    id: "poster_travel",
    name: "Vintage Travel Print",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-travel",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  poster_space: {
    blurb: "Feel small in the nicest way.",
    id: "poster_space",
    name: "Astronomy Print",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-space",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 35,
    unlockedByDefault: false,
  },
  poster_abstract: {
    blurb: "Means whatever you need it to.",
    id: "poster_abstract",
    name: "Abstract Art Print",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-abstract",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  poster_quote: {
    blurb: "Solid advice from a cat on a branch.",
    id: "poster_quote",
    name: "'Hang In There' Poster",
    category: "poster",
    mount: "wall",
    interactive: "art",
    textureKey: "poster-quote",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 20,
    unlockedByDefault: false,
  },
};

/** items eligible for the daily rotating "featured" slot — the desirable ones */
export const ROTATING_ITEM_IDS: string[] = [
  "speaker_vintage",
  "tv_gaming",
  "disco_ball",
  "arcade_cabinet",
  "pet_axolotl",
  "bed_canopy",
  "projector_screen",
  "neon_sign",
  "pet_corgi",
  "wallpaper_night",
  "hammock_chair",
  "poster_space",
];

export type RarityTier = "standard" | "nice" | "premium";
/** visual tier derived purely from price so new items classify themselves */
export const rarityFor = (price: number): RarityTier =>
  price >= 90 ? "premium" : price >= 40 ? "nice" : "standard";

export const FEATURED_COUNT = 3;

/** deterministic day-of-year pick, mirroring promptForToday()'s math */
export const featuredForToday = (d = new Date()): string[] => {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86_400_000,
  );
  const pool = ROTATING_ITEM_IDS;
  const out: string[] = [];
  for (let i = 0; i < Math.min(FEATURED_COUNT, pool.length); i++)
    out.push(pool[(dayOfYear * FEATURED_COUNT + i) % pool.length]!);
  return Array.from(new Set(out));
};


/** categories that can actually be dropped into a room layout */
export const PLACEABLE_CATEGORIES: ItemDef["category"][] = ["furniture", "companion", "poster"];

export const isPlaceable = (item: ItemDef) => PLACEABLE_CATEGORIES.includes(item.category);

export type Rotation = 0 | 90 | 180 | 270;

/** 90°/270° swaps an item's tile footprint for placement + collision purposes */
export const rotatedFootprint = (item: ItemDef, rotation: Rotation = 0) =>
  rotation === 90 || rotation === 270
    ? { w: item.footprint.h, h: item.footprint.w }
    : { w: item.footprint.w, h: item.footprint.h };


export const isWallItem = (item: ItemDef | undefined) => item?.mount === "wall";

/** footprint used for placement: wall items are always one row tall and never rotate */
export const effectiveFootprint = (item: ItemDef, rotation: Rotation = 0) =>
  isWallItem(item) ? { w: item.footprint.w, h: 1 } : rotatedFootprint(item, rotation);

/** popup viewer texture for a poster's in-room texture key */
export const zoomTextureKey = (textureKey: string) => `${textureKey}-zoom`;

/** every wallpaper the player can equip, in catalog order */
export const WALLPAPER_ITEM_IDS = Object.values(ITEM_CATALOG)
  .filter((i) => i.category === "wallpaper")
  .map((i) => i.id);

export const WALLPAPER_DEFAULT = "wallpaper_default";
export const POSTER_DEFAULT = "poster_default";

/* ---------------- shared display tint ---------------- */

const mixColor = (a: number, b: number, t: number) => {
  const ch = (shift: number) =>
    Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/**
 * The one recolor rule for neutral-authored textures, used by the room scene AND the shop
 * thumbnails so they can never drift: posters take the room mood's accent, the basic TV a
 * pale mood glow, everything else its own catalog tint (or none).
 */
export const displayTintFor = (item: ItemDef, moodKey: MoodKey): number | undefined => {
  const mood = MOODS[moodKey] ?? MOODS.chill_ambient;
  if (item.category === "poster") return mixColor(mood.posterAccent, 0xffffff, 0.32);
  if (item.textureKey === "tv") return mixColor(mood.glow, 0xffffff, 0.62);
  return item.tint;
};

/* ---------------- collection sets ---------------- */

export type SetId = "arcade_night" | "vinyl_head" | "cozy_corner" | "movie_night" | "night_owl" | "small_friends";

export interface ItemSet {
  id: SetId;
  name: string;
  itemIds: string[];
}

/** one-time coin bonus for owning every item in a set */
export const SET_REWARD = 25;

export const ITEM_SETS: ItemSet[] = [
  { id: "arcade_night", name: "Arcade Night", itemIds: ["arcade_cabinet", "tv_gaming", "neon_sign", "disco_ball"] },
  {
    id: "vinyl_head",
    name: "Vinyl Head",
    itemIds: ["record_player", "vinyl_crate", "speaker_boombox", "speaker_tower", "speaker_vintage"],
  },
  {
    id: "cozy_corner",
    name: "Cozy Corner",
    itemIds: ["hammock_chair", "papasan_chair", "cushion_stack", "lava_lamp", "shelf_books"],
  },
  { id: "movie_night", name: "Movie Night", itemIds: ["projector_screen", "tv_crt", "chair_lounge", "rug_shag"] },
  { id: "night_owl", name: "Night Owl", itemIds: ["bed_canopy", "wallpaper_night", "poster_space"] },
  { id: "small_friends", name: "Small Friends", itemIds: ["pet_hamster", "pet_betta", "pet_axolotl", "plant_bonsai"] },
];

export const SET_BY_ID = Object.fromEntries(ITEM_SETS.map((st) => [st.id, st])) as Record<SetId, ItemSet>;

for (const st of ITEM_SETS)
  for (const id of st.itemIds) {
    const item = ITEM_CATALOG[id];
    if (item) item.set = st.id;
  }

/** placed items that glow at night (TVs flicker) */
export const ITEM_LIGHTS: Record<string, NonNullable<ItemDef["light"]>> = {
  tv_basic: { color: 0x8fb8ff, radius: 50, flicker: true },
  tv_crt: { color: 0x8fb8ff, radius: 50, flicker: true },
  tv_mounted: { color: 0x8fb8ff, radius: 50, flicker: true },
  tv_gaming: { color: 0x8fb8ff, radius: 50, flicker: true },
  lava_lamp: { color: 0xff8a5c, radius: 60 },
  neon_sign: { color: 0xff5fa8, radius: 60 },
  arcade_cabinet: { color: 0x6fe0d0, radius: 40 },
  disco_ball: { color: 0xdfe6ff, radius: 70 },
  speaker_vintage: { color: 0xffc070, radius: 22 },
};
for (const [id, light] of Object.entries(ITEM_LIGHTS)) {
  const item = ITEM_CATALOG[id];
  if (item) item.light = light;
}

export const setProgress = (setId: SetId, ownedIds: Iterable<string>) => {
  const owned = new Set(ownedIds);
  const st = SET_BY_ID[setId];
  return { owned: st.itemIds.filter((id) => owned.has(id)).length, total: st.itemIds.length };
};

/** sets that are fully owned but not yet rewarded */
export const newlyCompletedSets = (ownedIds: Iterable<string>, completed: Iterable<string>): SetId[] => {
  const owned = new Set(ownedIds);
  const done = new Set(completed);
  return ITEM_SETS.filter((st) => !done.has(st.id) && st.itemIds.every((id) => owned.has(id))).map(
    (st) => st.id,
  );
};
