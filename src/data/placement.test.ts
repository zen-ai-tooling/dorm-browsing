import { describe, expect, test } from "bun:test";
import { canPlaceIn, migrateMountLayout } from "./placement";

describe("wall vs floor placement", () => {
  test("wall items only go on row 0", () => {
    expect(canPlaceIn([], "poster_default", 2, 0)).toBe(true);
    expect(canPlaceIn([], "poster_default", 2, 1)).toBe(false);
  });

  test("floor items can't go on row 0", () => {
    expect(canPlaceIn([], "plant_basic", 2, 0)).toBe(false);
    expect(canPlaceIn([], "plant_basic", 2, 1)).toBe(true);
  });

  test("wall items don't collide with floor items below them", () => {
    const layout = [{ itemId: "plant_basic", gx: 2, gy: 1 }];
    expect(canPlaceIn(layout, "poster_default", 2, 0)).toBe(true);
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
});
