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
  interactive?: "songs" | "bulletin" | "companion";
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
    textureKey: "poster_gig",
    footprint: { w: 1, h: 1 },
    solid: false,
    price: 25,
    unlockedByDefault: false,
  },
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


export const WALLPAPER_DEFAULT = "wallpaper_default";
export const POSTER_DEFAULT = "poster_default";
