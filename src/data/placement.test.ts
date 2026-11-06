import { describe, expect, test } from "bun:test";
import { ROOMS, type PlacedItem } from "./dorm";
import { ITEM_CATALOG, layerOf, type Rotation } from "./items";
import { canPlaceIn, footprintBase, migrateMountLayout, nearestSpot, walkabilityOk } from "./placement";

const ok = (layout: PlacedItem[], id: string, gx: number, gy: number, rot: Rotation = 0) =>
  canPlaceIn(layout, id, gx, gy, rot).ok;
const reason = (layout: PlacedItem[], id: string, gx: number, gy: number, rot: Rotation = 0) => {
  const r = canPlaceIn(layout, id, gx, gy, rot);
  return r.ok ? null : r.reason;
};

describe("footprints", () => {
  test("spot checks: measured bases, not drawn pixels", () => {
    expect(ITEM_CATALOG.speaker_basic!.footprint).toEqual({ w: 1, h: 1 });
    expect(ITEM_CATALOG.plant_basic!.footprint).toEqual({ w: 1, h: 1 });
    expect(ITEM_CATALOG.tv_basic!.footprint).toEqual({ w: 3, h: 1 });
    expect(ITEM_CATALOG.desk_basic!.footprint).toEqual({ w: 3, h: 1 });
    expect(ITEM_CATALOG.bed_basic!.footprint).toEqual({ w: 3, h: 2 });
    expect(ITEM_CATALOG.bed_canopy!.footprint).toEqual({ w: 3, h: 2 });
    expect(ITEM_CATALOG.rug_woven!.footprint).toEqual({ w: 5, h: 3 });
    expect(ITEM_CATALOG.speaker_tower!.footprint).toEqual({ w: 1, h: 1 });
  });

  test("layers: rugs are rugs, wall mounts are wall, the rest is floor", () => {
    expect(layerOf(ITEM_CATALOG.rug_woven)).toBe("rug");
    expect(layerOf(ITEM_CATALOG.rug_midnight)).toBe("rug");
    expect(layerOf(ITEM_CATALOG.poster_default)).toBe("wall");
    expect(layerOf(ITEM_CATALOG.board_basic)).toBe("wall");
    expect(layerOf(ITEM_CATALOG.bed_basic)).toBe("floor");
  });

  test("base anchoring: bottom edge on the footprint's bottom edge, centered", () => {
    expect(footprintBase(3, 3, 5, 3)).toEqual({ x: 5.5, y: 6 });
    expect(footprintBase(0, 1, 1, 1)).toEqual({ x: 0.5, y: 2 });
  });
});

describe("wall vs floor placement", () => {
  test("wall items only go on row 0", () => {
    expect(ok([], "poster_default", 4, 0)).toBe(true);
    expect(ok([], "poster_default", 4, 1)).toBe(false);
  });

  test("floor items can't go on row 0", () => {
    expect(ok([], "plant_basic", 2, 0)).toBe(false);
    expect(ok([], "plant_basic", 2, 1)).toBe(true);
  });

  test("wall items don't collide with floor items below them", () => {
    const layout = [{ itemId: "plant_basic", gx: 4, gy: 1 }];
    expect(ok(layout, "poster_default", 4, 0)).toBe(true);
  });
});

describe("the rug layer", () => {
  test("a rug slides under a bed", () => {
    const layout = [{ itemId: "bed_basic", gx: 9, gy: 5 }];
    expect(ok(layout, "rug_woven", 7, 4)).toBe(true);
  });

  test("rug on rug is rejected", () => {
    const layout = [{ itemId: "rug_woven", gx: 3, gy: 3 }];
    const r = reason(layout, "rug_shag", 4, 4);
    expect(r).toEqual({ kind: "overlap", name: "Woven Rug" });
  });

  test("rugs may cover the door lane; floor items may not", () => {
    expect(ok([], "rug_woven", 4, 6)).toBe(true); // covers (5,8) and (6,8)
    expect(reason([], "tv_basic", 4, 8)).toEqual({ kind: "door" });
  });

  test("rugs never block walking, even under furniture", () => {
    const layout: PlacedItem[] = [
      { itemId: "rug_woven", gx: 3, gy: 3 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
    ];
    expect(walkabilityOk(layout).ok).toBe(true);
  });
});

describe("rejection reasons", () => {
  test("bounds", () => {
    expect(reason([], "bed_basic", 10, 7)).toEqual({ kind: "bounds" });
    expect(reason([], "bed_basic", -1, 3)).toEqual({ kind: "bounds" });
  });
  test("wall-only / floor-only", () => {
    expect(reason([], "poster_default", 4, 1)).toEqual({ kind: "wall-only" });
    expect(reason([], "plant_basic", 2, 0)).toEqual({ kind: "floor-only" });
  });
  test("window", () => {
    expect(reason([], "poster_default", 0, 0)).toEqual({ kind: "window" });
    expect(reason([], "board_basic", 2, 0)).toEqual({ kind: "window" });
  });
  test("overlap names the other item", () => {
    const layout = [{ itemId: "bed_basic", gx: 9, gy: 5 }];
    expect(reason(layout, "desk_basic", 9, 5)).toEqual({ kind: "overlap", name: "Basic Bed" });
  });
});

describe("walkability", () => {
  test("boxing in the speaker is rejected and names it", () => {
    const layout: PlacedItem[] = [
      { itemId: "speaker_basic", gx: 5, gy: 4 },
      { itemId: "tv_basic", gx: 4, gy: 3 },
      { itemId: "tv_gaming", gx: 4, gy: 5 },
      { itemId: "speaker_tower", gx: 4, gy: 4 },
    ];
    // the last wall of the box: speaker_tower east of the speaker
    const r = reason(layout, "speaker_tower", 6, 4);
    expect(r).toEqual({ kind: "blocks-path", name: "Speaker" });
  });

  test("a valid furnished layout passes", () => {
    const layout: PlacedItem[] = [
      { itemId: "poster_default", gx: 4, gy: 0 },
      { itemId: "board_basic", gx: 9, gy: 0 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
      { itemId: "tv_basic", gx: 9, gy: 3 },
      { itemId: "desk_basic", gx: 1, gy: 7 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
      { itemId: "plant_basic", gx: 1, gy: 4 },
      { itemId: "rug_woven", gx: 3, gy: 3 },
    ];
    for (let i = 0; i < layout.length; i++) {
      const p = layout[i]!;
      expect(ok(layout.slice(0, i), p.itemId, p.gx, p.gy)).toBe(true);
    }
    expect(walkabilityOk(layout).ok).toBe(true);
  });

  test("a wall item needs a reachable tile in row 1 beneath it", () => {
    // shelf_books (solid 2x1) + pottery wheel block every row-1 tile under a 2-wide board
    const layout: PlacedItem[] = [
      { itemId: "shelf_books", gx: 8, gy: 1 },
      { itemId: "tv_basic", gx: 9, gy: 3 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
    ];
    expect(reason(layout, "board_basic", 8, 0)).toEqual({ kind: "blocks-path", name: "Bulletin Board" });
    expect(ok(layout, "board_basic", 4, 0)).toBe(true);
  });
});

describe("window slot", () => {
  test("floor items below the window are unaffected", () => {
    expect(ok([], "plant_basic", 1, 1)).toBe(true);
  });
  test("a saved poster over the window shifts to the nearest free slot", () => {
    const out = migrateMountLayout([{ itemId: "poster_default", gx: 1, gy: 0 }]);
    expect(out).toHaveLength(1);
    expect(out[0]!.gx).toBe(3);
  });
});

describe("old saved layouts", () => {
  test("board moves onto the wall and floor items leave row 0, nothing vanishes", () => {
    const out = migrateMountLayout([
      { itemId: "board_basic", gx: 9, gy: 1 },
      { itemId: "plant_basic", gx: 1, gy: 0 },
      { itemId: "poster_default", gx: 4, gy: 0 },
    ]);
    expect(out).toHaveLength(3);
    expect(out.find((p) => p.itemId === "board_basic")?.gy).toBe(0);
    expect(out.find((p) => p.itemId === "plant_basic")?.gy).toBe(1);
  });

  test("nearestSpot finds the closest valid tile", () => {
    const layout = [{ itemId: "bed_basic", gx: 9, gy: 5 }];
    expect(nearestSpot(layout, "desk_basic", 9, 5)).toEqual({ gx: 9, gy: 4 });
    expect(nearestSpot(layout, "rug_woven", 3, 3)).toEqual({ gx: 3, gy: 3 });
  });
});

describe("seed layouts", () => {
  test("Your Room, Sam and Jordan all pass today's rules", () => {
    for (const room of ROOMS) {
      const placed: PlacedItem[] = [];
      for (const p of room.layout) {
        const r = canPlaceIn(placed, p.itemId, p.gx, p.gy, (p.rotation ?? 0) as Rotation);
        expect({ room: room.id, item: p.itemId, ok: r.ok }).toEqual({ room: room.id, item: p.itemId, ok: true });
        placed.push(p);
      }
      expect(walkabilityOk(room.layout).ok).toBe(true);
    }
  });
});
