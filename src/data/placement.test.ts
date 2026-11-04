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

describe("window slot", () => {
  test("no wall item can overlap face columns 1–2", () => {
    expect(canPlaceIn([], "poster_default", 0, 0)).toBe(false); // 3 wide: covers 1–2
    expect(canPlaceIn([], "board_basic", 2, 0)).toBe(false);
    expect(canPlaceIn([], "board_basic", 3, 0)).toBe(true);
  });
  test("floor items below the window are unaffected", () => {
    expect(canPlaceIn([], "plant_basic", 1, 1)).toBe(true);
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
});
