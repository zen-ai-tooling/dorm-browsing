import { isPaletteColor, ITEM_CATALOG, MAT_DEFAULT } from "./items";
import { STICKER_BY_ID } from "./stickers";

/** Your door in the hall (Iteration 28): plain data, normalized on load */
export type PlateStyle = "cream" | "dark" | "wood" | "neon";
export const PLATE_STYLES: PlateStyle[] = ["cream", "dark", "wood", "neon"];

export interface DoorState {
  /** null = room accent (the original look) */
  frameColor: number | null;
  /** null = "{name}'s Room" */
  plateText: string | null;
  plateStyle: PlateStyle;
  /** sticker ids from stickers.ts */
  stickers: string[];
  boardMode: "answer" | "custom";
  boardText: string | null;
  matId: string;
}

export const PLATE_MAX = 18;
export const BOARD_MAX = 24;
export const DOOR_STICKER_MAX = 4;

export const DOOR_DEFAULT: DoorState = {
  frameColor: null,
  plateText: null,
  plateStyle: "cream",
  stickers: [],
  boardMode: "answer",
  boardText: null,
  matId: MAT_DEFAULT,
};

const cleanText = (v: unknown, max: number) => {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").slice(0, max);
  return s.trim() ? s : null;
};

/** any saved (or missing) door becomes a valid one; older saves get today's look */
export const normalizeDoor = (raw: unknown, ownedItemIds: readonly string[] = []): DoorState => {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof DoorState, unknown>>;
  const stickers = Array.isArray(d.stickers)
    ? Array.from(new Set(d.stickers.filter((x): x is string => typeof x === "string" && !!STICKER_BY_ID[x]))).slice(
        0,
        DOOR_STICKER_MAX,
      )
    : [];
  const mat = typeof d.matId === "string" ? d.matId : MAT_DEFAULT;
  const matOk = ITEM_CATALOG[mat]?.category === "mat" && (mat === MAT_DEFAULT || ownedItemIds.includes(mat));
  return {
    frameColor: isPaletteColor(d.frameColor) ? d.frameColor : null,
    plateText: cleanText(d.plateText, PLATE_MAX),
    plateStyle: PLATE_STYLES.includes(d.plateStyle as PlateStyle) ? (d.plateStyle as PlateStyle) : "cream",
    stickers,
    boardMode: d.boardMode === "custom" ? "custom" : "answer",
    boardText: cleanText(d.boardText, BOARD_MAX),
    matId: matOk ? mat : MAT_DEFAULT,
  };
};

/** what changed between two doors — residents comment on the most visible one */
export type DoorChange = "stickers" | "neon" | "plate" | "frame" | "board" | "mat";
export const doorChange = (a: DoorState, b: DoorState): DoorChange | null => {
  if (b.plateStyle === "neon" && a.plateStyle !== "neon") return "neon";
  if (b.stickers.join() !== a.stickers.join()) return "stickers";
  if (b.plateText !== a.plateText || b.plateStyle !== a.plateStyle) return "plate";
  if (b.frameColor !== a.frameColor) return "frame";
  if (b.boardMode !== a.boardMode || b.boardText !== a.boardText) return "board";
  if (b.matId !== a.matId) return "mat";
  return null;
};

/** sticker art size at ×1 (12×12 bitmap) and the 2×2 grid gap */
export const DOOR_STICKER_PX = 12;
const GAP = 2;

/**
 * Fixed sticker slots on the hall face left of the door frame (2×2), as world px.
 * `faceLeft` is the face tile's left edge, `jambLeft` the frame's outer edge and `faceTop` row 16's top.
 */
export const doorStickerSlots = (faceLeft: number, jambLeft: number, faceTop: number) => {
  const gridW = DOOR_STICKER_PX * 2 + GAP;
  const x0 = Math.round(faceLeft + (jambLeft - faceLeft - gridW) / 2);
  const y0 = faceTop + 18;
  return Array.from({ length: DOOR_STICKER_MAX }, (_, i) => ({
    x: x0 + (i % 2) * (DOOR_STICKER_PX + GAP),
    y: y0 + Math.floor(i / 2) * (DOOR_STICKER_PX + GAP),
    w: DOOR_STICKER_PX,
    h: DOOR_STICKER_PX,
  }));
};
