import type { MoodKey, PlacedItem } from "@/data/dorm";
import { accentTextureKey, accentTintFor, baseTintFor, ITEM_CATALOG, type ItemDef } from "@/data/items";

/** anything that can hand back a generated texture's source canvas (the DormScene) */
interface TextureSourceProvider {
  getTextureSource(key: string): HTMLCanvasElement | HTMLImageElement | null;
}

export interface ItemThumb {
  src: string;
  w: number;
  h: number;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** multiply-tints `src` onto ctx at 0,0 with its alpha restored (destination-in via a scratch canvas) */
const drawTinted = (ctx: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, tint?: number) => {
  if (tint === undefined) {
    ctx.drawImage(src, 0, 0);
    return;
  }
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext("2d");
  if (!x) return;
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = hex(tint);
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(src, 0, 0);
  ctx.drawImage(c, 0, 0);
};

const cache = new Map<string, ItemThumb>();

/**
 * One item's thumbnail exactly as the room draws it (displayTintFor / baseTintFor + accent overlay).
 * Cached by item id + mood + tint, so recolor previews in the shop are cheap.
 */
export const buildItemThumb = (
  scene: TextureSourceProvider,
  item: ItemDef,
  mood: MoodKey,
  placedTint?: number,
): ItemThumb | null => {
  // floor swatches are repainted per mood, so they're never cached
  const key = `${item.id}|${mood}|${placedTint ?? "orig"}`;
  const hit = item.category === "floor" ? undefined : cache.get(key);
  if (hit) return hit;
  const src = scene.getTextureSource(item.textureKey);
  if (!src) return null;
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  drawTinted(ctx, src, baseTintFor(item, mood, placedTint));
  const accentTint = accentTintFor(item, placedTint);
  const accent = accentTint !== undefined ? scene.getTextureSource(accentTextureKey(item.textureKey)) : null;
  if (accent) drawTinted(ctx, accent, accentTint);
  const out = { src: canvas.toDataURL(), w: src.width, h: src.height };
  if (item.category !== "floor") cache.set(key, out);
  return out;
};

/** every item's thumbnail; pieces placed in Your Room show the colour you gave them */
export const buildItemThumbs = (
  scene: TextureSourceProvider,
  mood: MoodKey,
  layout: readonly PlacedItem[] = [],
): Record<string, ItemThumb> => {
  const tints = new Map(layout.filter((p) => typeof p.tint === "number").map((p) => [p.itemId, p.tint!]));
  const out: Record<string, ItemThumb> = {};
  for (const item of Object.values(ITEM_CATALOG)) {
    const th = buildItemThumb(scene, item, mood, tints.get(item.id));
    if (th) out[item.id] = th;
  }
  return out;
};
