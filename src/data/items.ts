export interface ItemDef {
  id: string;
  name: string;
  category: "furniture" | "wallpaper" | "poster" | "companion";
  /** matches a texture key generated in game/textures.ts */
  textureKey: string;
  /** tile footprint, used for grid snapping and overlap prevention */
  footprint: { w: number; h: number };
  solid: boolean;
  /** which popup this triggers, if any */
  interactive?: "songs" | "bulletin" | "companion" | "watching" | "art";
  /** wallpaper items only: the wall base colour applied when equipped */
  wallColor?: number;
  /** wallpaper items only: pattern drawn over the wall base */
  wallPattern?: "flat" | "stripes" | "checker" | "botanical" | "night" | "graph" | "sunset";
  /** optional recolor applied to the (neutral-authored) texture */
  tint?: number;
  /** coin cost in the shop; 0 for starter items */
  price: number;
  unlockedByDefault: boolean;
}

export const ITEM_CATALOG: Record<string, ItemDef> = {
  bed_basic: {
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
    id: "board_basic",
    name: "Bulletin Board",
    category: "furniture",
    textureKey: "board",
    footprint: { w: 2, h: 2 },
    solid: false,
    interactive: "bulletin",
    price: 0,
    unlockedByDefault: true,
  },
  plant_basic: {
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
    id: "poster_default",
    name: "Wall Poster",
    category: "poster",
    interactive: "art",
    textureKey: "poster",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 0,
    unlockedByDefault: true,
  },
  rug_woven: {
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
    id: "chair_lounge",
    name: "Lounge Couch",
    category: "furniture",
    textureKey: "couch",
    footprint: { w: 4, h: 2 },
    solid: true,
    price: 55,
    unlockedByDefault: false,
  },
  shelf_books: {
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
    id: "poster_gig",
    name: "Gig Poster",
    category: "poster",
    interactive: "art",
    textureKey: "poster-band",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 25,
    unlockedByDefault: false,
  },

  // ---- iteration 14: speaker + TV variants (functionally identical, visually distinct) ----
  speaker_boombox: {
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
    id: "neon_sign",
    name: "Neon 'Vibes' Sign",
    category: "furniture",
    textureKey: "neon",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 65,
    unlockedByDefault: false,
  },
  papasan_chair: {
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
    id: "poster_tour",
    name: "Band Tour Poster",
    category: "poster",
    interactive: "art",
    textureKey: "poster-tour",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 25,
    unlockedByDefault: false,
  },
  poster_travel: {
    id: "poster_travel",
    name: "Vintage Travel Print",
    category: "poster",
    interactive: "art",
    textureKey: "poster-travel",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  poster_space: {
    id: "poster_space",
    name: "Astronomy Print",
    category: "poster",
    interactive: "art",
    textureKey: "poster-space",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 35,
    unlockedByDefault: false,
  },
  poster_abstract: {
    id: "poster_abstract",
    name: "Abstract Art Print",
    category: "poster",
    interactive: "art",
    textureKey: "poster-abstract",
    footprint: { w: 3, h: 1 },
    solid: false,
    price: 30,
    unlockedByDefault: false,
  },
  poster_quote: {
    id: "poster_quote",
    name: "'Hang In There' Poster",
    category: "poster",
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
export const PLACEABLE_CATEGORIES: ItemDef["category"][] = ["furniture", "companion"];

export const isPlaceable = (item: ItemDef) => PLACEABLE_CATEGORIES.includes(item.category);

export type Rotation = 0 | 90 | 180 | 270;

/** 90°/270° swaps an item's tile footprint for placement + collision purposes */
export const rotatedFootprint = (item: ItemDef, rotation: Rotation = 0) =>
  rotation === 90 || rotation === 270
    ? { w: item.footprint.h, h: item.footprint.w }
    : { w: item.footprint.w, h: item.footprint.h };


/** popup viewer texture for a poster's in-room texture key */
export const zoomTextureKey = (textureKey: string) => `${textureKey}-zoom`;

/** every wallpaper the player can equip, in catalog order */
export const WALLPAPER_ITEM_IDS = Object.values(ITEM_CATALOG)
  .filter((i) => i.category === "wallpaper")
  .map((i) => i.id);

export const WALLPAPER_DEFAULT = "wallpaper_default";
export const POSTER_DEFAULT = "poster_default";
