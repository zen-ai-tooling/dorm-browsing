import type { PlacedItem } from "@/data/dorm";
import { effectiveFootprint, isWallItem, ITEM_CATALOG, type Rotation } from "@/data/items";

/** personal-room interior size (tiles); row 0 is the back-wall face */
export const ROOM_W = 12;
export const ROOM_H = 9;

/** tiles just inside the door — kept clear so the room stays enterable */
export const isDoorLane = (gx: number, gy: number) => gy === ROOM_H - 1 && (gx === 5 || gx === 6);

/**
 * Wall items live on row 0 and only collide with other wall items;
 * floor items live on rows 1+ and only collide with floor items.
 */
export function canPlaceIn(
  layout: PlacedItem[],
  itemId: string,
  gx: number,
  gy: number,
  rotation: Rotation = 0,
  ignoreIdx = -1,
): boolean {
  const item = ITEM_CATALOG[itemId];
  if (!item) return false;
  const wall = isWallItem(item);
  const { w, h } = effectiveFootprint(item, rotation);
  if (gx < 0 || gx + w > ROOM_W) return false;
  if (wall ? gy !== 0 : gy < 1 || gy + h > ROOM_H) return false;
  if (!wall)
    for (let y = gy; y < gy + h; y++)
      for (let x = gx; x < gx + w; x++) if (isDoorLane(x, y)) return false;
  return !layout.some((p, i) => {
    if (i === ignoreIdx) return false;
    const other = ITEM_CATALOG[p.itemId];
    if (!other || isWallItem(other) !== wall) return false;
    const o = effectiveFootprint(other, (p.rotation ?? 0) as Rotation);
    return gx < p.gx + o.w && gx + w > p.gx && gy < p.gy + o.h && gy + h > p.gy;
  });
}

/**
 * Moves wall items onto row 0 and floor items off it. Items that can't find a
 * valid tile are left out of the layout (they return to the tray) — never deleted
 * from ownership, since ownership lives separately.
 */
export function migrateMountLayout(layout: PlacedItem[]): PlacedItem[] {
  const out: PlacedItem[] = [];
  const tryAdd = (p: PlacedItem) => {
    const rot = (p.rotation ?? 0) as Rotation;
    if (canPlaceIn(out, p.itemId, p.gx, p.gy, rot)) {
      out.push(p);
      return true;
    }
    return false;
  };
  for (const raw of layout) {
    const item = ITEM_CATALOG[raw.itemId];
    if (!item) continue;
    const wall = isWallItem(item);
    const p: PlacedItem = wall
      ? { itemId: raw.itemId, gx: raw.gx, gy: 0 }
      : { ...raw, gy: raw.gy < 1 ? 1 : raw.gy };
    if (tryAdd(p)) continue;
    // nearest valid tile by Manhattan distance
    const rot = (p.rotation ?? 0) as Rotation;
    let best: PlacedItem | null = null;
    let bestD = Infinity;
    for (let gy = wall ? 0 : 1; gy <= (wall ? 0 : ROOM_H - 1); gy++)
      for (let gx = 0; gx < ROOM_W; gx++) {
        const d = Math.abs(gx - p.gx) + Math.abs(gy - p.gy);
        if (d < bestD && canPlaceIn(out, p.itemId, gx, gy, rot)) {
          best = { ...p, gx, gy };
          bestD = d;
        }
      }
    if (best) out.push(best);
  }
  return out;
}
