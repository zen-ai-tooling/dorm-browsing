import { effectiveLook, lookHash, type AvatarLook } from "@/data/avatar";
import { ITEM_CATALOG } from "@/data/items";
import { CHAR_H, CHAR_W, paintChar, type Dir, type Painter } from "@/game/avatarDraw";

const cache = new Map<string, string>();

/** a look rendered to a PNG data URL at `scale` px per art pixel (same painter as the world sprite) */
export const avatarDataUrl = (look: AvatarLook, dir: Dir = "down", step = 0, scale = 2): string => {
  if (typeof document === "undefined") return "";
  const drawn = effectiveLook(look, ITEM_CATALOG);
  const key = `${lookHash(drawn)}-${dir}-${step}-${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = CHAR_W * scale;
  canvas.height = CHAR_H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
  const painter: Painter = {
    fillStyle(color, alpha = 1) {
      ctx.fillStyle = hex(color);
      ctx.globalAlpha = alpha;
    },
    fillRect(x, y, w, h) {
      ctx.fillRect(x, y, w, h);
    },
  };
  paintChar(painter, drawn, dir, step, scale);
  const url = canvas.toDataURL();
  if (cache.size > 400) cache.clear();
  cache.set(key, url);
  return url;
};

/** shop thumbnails for outfits: your own avatar wearing each one */
export const outfitThumbs = (look: AvatarLook) => {
  const out: Record<string, { src: string; w: number; h: number }> = {};
  for (const item of Object.values(ITEM_CATALOG)) {
    if (item.category !== "outfit") continue;
    out[item.id] = {
      src: avatarDataUrl({ ...look, outfitItemId: item.id }, "down", 0, 4),
      w: CHAR_W * 4,
      h: CHAR_H * 4,
    };
  }
  return out;
};
