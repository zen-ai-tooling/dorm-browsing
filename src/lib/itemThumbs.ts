import type { MoodKey } from "@/data/dorm";
import { displayTintFor, ITEM_CATALOG } from "@/data/items";

/** anything that can hand back a generated texture's source canvas (the DormScene) */
interface TextureSourceProvider {
  getTextureSource(key: string): HTMLCanvasElement | HTMLImageElement | null;
}

export interface ItemThumb {
  src: string;
  w: number;
  h: number;
}

/** draws each item's texture with its display tint multiplied in, alpha restored via destination-in */
const buildItemThumbs = (scene: TextureSourceProvider, mood: MoodKey): Record<string, ItemThumb> => {
  const out: Record<string, ItemThumb> = {};
  for (const item of Object.values(ITEM_CATALOG)) {
    const src = scene.getTextureSource(item.textureKey);
    if (!src) continue;
    const canvas = document.createElement("canvas");
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    const tint = displayTintFor(item, mood);
    if (tint !== undefined) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `#${tint.toString(16).padStart(6, "0")}`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(src, 0, 0);
    }
    out[item.id] = { src: canvas.toDataURL(), w: src.width, h: src.height };
  }
  return out;
};

