export interface ItemDef {
  id: string;
  name: string;
  category: "furniture" | "wallpaper" | "poster" | "companion";
  /** matches a texture key generated in game/textures.ts */
  textureKey: string;
  /** tile footprint, for future collision-aware placement */
  footprint: { w: number; h: number };
  solid: boolean;
  /** which popup this triggers, if any */
  interactive?: "songs" | "bulletin" | "companion";
  /** true for everything in this pass — no economy yet */
  unlockedByDefault: boolean;
}

export const ITEM_CATALOG: Record<string, ItemDef> = {
  bed_basic: {
    id: "bed_basic",
    name: "Basic Bed",
    category: "furniture",
    textureKey: "bed",
    footprint: { w: 2, h: 2 },
    solid: true,
    unlockedByDefault: true,
  },
  desk_basic: {
    id: "desk_basic",
    name: "Basic Desk",
    category: "furniture",
    textureKey: "desk",
    footprint: { w: 2, h: 1 },
    solid: true,
    unlockedByDefault: true,
  },
  speaker_basic: {
    id: "speaker_basic",
    name: "Speaker",
    category: "furniture",
    textureKey: "speaker",
    footprint: { w: 1, h: 1 },
    solid: false,
    interactive: "songs",
    unlockedByDefault: true,
  },
  board_basic: {
    id: "board_basic",
    name: "Bulletin Board",
    category: "furniture",
    textureKey: "board",
    footprint: { w: 1, h: 1 },
    solid: false,
    interactive: "bulletin",
    unlockedByDefault: true,
  },
  plant_basic: {
    id: "plant_basic",
    name: "Potted Plant",
    category: "companion",
    textureKey: "plant",
    footprint: { w: 1, h: 1 },
    solid: false,
    interactive: "companion",
    unlockedByDefault: true,
  },
  pet_cat_basic: {
    id: "pet_cat_basic",
    name: "Cat",
    category: "companion",
    textureKey: "pet",
    footprint: { w: 1, h: 1 },
    solid: false,
    interactive: "companion",
    unlockedByDefault: true,
  },
  lamp_basic: {
    id: "lamp_basic",
    name: "Floor Lamp",
    category: "furniture",
    textureKey: "lamp",
    footprint: { w: 1, h: 1 },
    solid: false,
    unlockedByDefault: true,
  },
  rug_woven: {
    id: "rug_woven",
    name: "Woven Rug",
    category: "furniture",
    textureKey: "rug",
    footprint: { w: 3, h: 2 },
    solid: false,
    unlockedByDefault: true,
  },
};

export const WALLPAPER_DEFAULT = "wallpaper_default";
export const POSTER_DEFAULT = "poster_default";
