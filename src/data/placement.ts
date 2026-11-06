import type { PlacedItem } from "@/data/dorm";
import { effectiveFootprint, isWallItem, ITEM_CATALOG, layerOf, type Rotation } from "@/data/items";

/** personal-room interior size (tiles); row 0 is the back-wall face */
export const ROOM_W = 12;
export const ROOM_H = 9;

/** back-wall face columns taken by the window — wall items can't hang there */
export const WINDOW_COLS = [1, 2] as const;
export const isWindowCol = (gx: number) => (WINDOW_COLS as readonly number[]).includes(gx);

/** tiles just inside the door — kept clear so the room stays enterable */
export const isDoorLane = (gx: number, gy: number) => gy === ROOM_H - 1 && (gx === 5 || gx === 6);

export type PlaceRejection =
  | { kind: "overlap"; name: string }
  | { kind: "door" }
  | { kind: "blocks-path"; name: string }
  | { kind: "wall-only" }
  | { kind: "floor-only" }
  | { kind: "window" }
  | { kind: "bounds" };

export type PlaceResult = { ok: true } | { ok: false; reason: PlaceRejection };

/** sprite anchoring: the sprite's bottom edge sits on the footprint's bottom edge, centered */
export const footprintBase = (gx: number, gy: number, w: number, h: number) => ({
  x: gx + w / 2,
  y: gy + h,
});

const tilesOf = (p: PlacedItem) => {
  const item = ITEM_CATALOG[p.itemId];
  if (!item) return { w: 1, h: 1 };
  return effectiveFootprint(item, (p.rotation ?? 0) as Rotation);
};

/**
 * Walkability: from the door lane, flood fill floor tiles not covered by solid
 * footprints. Every interactive item must stay reachable — a tile next to a floor
 * item, or a row-1 tile beneath a wall item. Returns the cut-off item's name.
 */
export function walkabilityOk(layout: PlacedItem[]): { ok: boolean; name?: string } {
  const blocked: boolean[][] = Array.from({ length: ROOM_H }, () => Array(ROOM_W).fill(false));
  for (const p of layout) {
    const item = ITEM_CATALOG[p.itemId];
    if (!item || !item.solid || layerOf(item) !== "floor") continue;
    const { w, h } = tilesOf(p);
    for (let y = p.gy; y < p.gy + h; y++)
      for (let x = p.gx; x < p.gx + w; x++) if (y >= 1 && y < ROOM_H && x >= 0 && x < ROOM_W) blocked[y]![x] = true;
  }
  const seen = Array.from({ length: ROOM_H }, () => Array(ROOM_W).fill(false));
  const queue: Array<[number, number]> = [];
  for (const x of [5, 6])
    if (!blocked[ROOM_H - 1]![x]) {
      seen[ROOM_H - 1]![x] = true;
      queue.push([x, ROOM_H - 1]);
    }
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= ROOM_W || ny < 1 || ny >= ROOM_H) continue;
      if (blocked[ny]![nx] || seen[ny]![nx]) continue;
      seen[ny]![nx] = true;
      queue.push([nx, ny]);
    }
  }
  const reachable = (x: number, y: number) => x >= 0 && x < ROOM_W && y >= 1 && y < ROOM_H && seen[y]![x];
  for (const p of layout) {
    const item = ITEM_CATALOG[p.itemId];
    if (!item?.interactive) continue;
    const { w, h } = tilesOf(p);
    if (layerOf(item) === "wall") {
      let ok = false;
      for (let x = p.gx; x < p.gx + w; x++) if (reachable(x, 1)) ok = true;
      if (!ok) return { ok: false, name: item.name };
    } else {
      let ok = false;
      for (let y = p.gy; y < p.gy + h; y++)
        for (let x = p.gx; x < p.gx + w; x++)
          if (reachable(x - 1, y) || reachable(x + 1, y) || reachable(x, y - 1) || reachable(x, y + 1)) ok = true;
      if (!ok) return { ok: false, name: item.name };
    }
  }
  return { ok: true };
}

/**
 * Layered placement: wall items live on row 0 and only collide with wall items;
 * rugs only collide with rugs (they slide under furniture and may cross the door
 * lane); floor items only collide with floor items and keep the door lane clear.
 * A placement is also invalid if it would wall off an interactive item.
 */
export function canPlaceIn(
  layout: PlacedItem[],
  itemId: string,
  gx: number,
  gy: number,
  rotation: Rotation = 0,
  ignoreIdx = -1,
): PlaceResult {
  const item = ITEM_CATALOG[itemId];
  if (!item) return { ok: false, reason: { kind: "bounds" } };
  const layer = layerOf(item);
  const { w, h } = effectiveFootprint(item, rotation);
  if (gx < 0 || gx + w > ROOM_W || gy < 0 || gy + h > ROOM_H) return { ok: false, reason: { kind: "bounds" } };
  if (layer === "wall" && gy !== 0) return { ok: false, reason: { kind: "wall-only" } };
  if (layer !== "wall" && gy < 1) return { ok: false, reason: { kind: "floor-only" } };
  if (layer === "wall") {
    for (let x = gx; x < gx + w; x++) if (isWindowCol(x)) return { ok: false, reason: { kind: "window" } };
  } else if (layer === "floor") {
    for (let y = gy; y < gy + h; y++)
      for (let x = gx; x < gx + w; x++) if (isDoorLane(x, y)) return { ok: false, reason: { kind: "door" } };
  }
  for (let i = 0; i < layout.length; i++) {
    if (i === ignoreIdx) continue;
    const p = layout[i]!;
    const other = ITEM_CATALOG[p.itemId];
    if (!other || layerOf(other) !== layer) continue;
    const o = effectiveFootprint(other, (p.rotation ?? 0) as Rotation);
    if (gx < p.gx + o.w && gx + w > p.gx && gy < p.gy + o.h && gy + h > p.gy)
      return { ok: false, reason: { kind: "overlap", name: other.name } };
  }
  const next = layout.map((p, i) => (i === ignoreIdx ? { ...p, itemId, gx, gy, rotation } : p));
  if (ignoreIdx < 0 || ignoreIdx >= layout.length) next.push({ itemId, gx, gy, rotation });
  const walk = walkabilityOk(next);
  if (!walk.ok) return { ok: false, reason: { kind: "blocks-path", name: walk.name! } };
  return { ok: true };
}

/** boolean convenience for callers that only need yes/no */
export const placeable = (...args: Parameters<typeof canPlaceIn>) => canPlaceIn(...args).ok;

/** nearest valid tile to (prefGx, prefGy) by Manhattan distance, or null */
export function nearestSpot(
  layout: PlacedItem[],
  itemId: string,
  prefGx: number,
  prefGy: number,
  rotation: Rotation = 0,
): { gx: number; gy: number } | null {
  const wall = isWallItem(ITEM_CATALOG[itemId]);
  let best: { gx: number; gy: number } | null = null;
  let bestD = Infinity;
  for (let gy = wall ? 0 : 1; gy <= (wall ? 0 : ROOM_H - 1); gy++)
    for (let gx = 0; gx < ROOM_W; gx++) {
      const d = Math.abs(gx - prefGx) + Math.abs(gy - prefGy);
      if (d < bestD && canPlaceIn(layout, itemId, gx, gy, rotation).ok) {
        best = { gx, gy };
        bestD = d;
      }
    }
  return best;
}

/**
 * Moves wall items onto row 0 and floor items off it, then re-checks everything
 * against today's rules (layers + walkability). Items that can't find a valid tile
 * are left out of the layout (they return to the tray) — never deleted from
 * ownership, since ownership lives separately.
 */
export function migrateMountLayout(layout: PlacedItem[]): PlacedItem[] {
  const out: PlacedItem[] = [];
  const tryAdd = (p: PlacedItem) => {
    const rot = (p.rotation ?? 0) as Rotation;
    if (canPlaceIn(out, p.itemId, p.gx, p.gy, rot).ok) {
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
    const rot = (p.rotation ?? 0) as Rotation;
    const spot = nearestSpot(out, p.itemId, p.gx, p.gy, rot);
    if (spot) out.push({ ...p, ...spot });
  }
  return out;
}
