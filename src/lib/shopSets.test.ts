import { beforeAll, describe, expect, test } from "bun:test";
import { ITEM_CATALOG, rarityFor, SET_REWARD } from "../data/items";

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  location: { href: "http://localhost/", reload: () => {} },
  history: { state: null, replaceState: () => {} },
};

// Night Owl = bed_canopy 140 + wallpaper_night 55 + poster_space 35 = 230 coins
store.set("dorm-vibes-player-state", JSON.stringify({ coins: 300 }));

let m: typeof import("./playerStore");
beforeAll(async () => {
  m = await import("./playerStore");
  m.hydratePlayerState();
});

describe("rarity tiers", () => {
  test("standard under 40, nice 40–89, premium 90+", () => {
    expect(rarityFor(39)).toBe("standard");
    expect(rarityFor(40)).toBe("nice");
    expect(rarityFor(89)).toBe("nice");
    expect(rarityFor(90)).toBe("premium");
  });
});

describe("collection sets", () => {
  test("completing a set grants +25 exactly once", () => {
    m.playerActions.buy("bed_canopy");
    m.playerActions.buy("wallpaper_night");
    expect(m.takeCompletedSets()).toEqual([]);
    m.playerActions.buy("poster_space");
    expect(m.takeCompletedSets()).toEqual(["night_owl"]);
    expect(SET_REWARD).toBe(25);
    expect(m.getPlayerState().coins).toBe(300 - 140 - 55 - 35 + 25);
  });

  test("the reward is remembered in the save and never paid again", () => {
    const saved = JSON.parse(store.get("dorm-vibes-player-state")!);
    expect(saved.completedSets).toEqual(["night_owl"]);
    // a later purchase in another set doesn't re-pay Night Owl
    const before = m.getPlayerState().coins;
    m.playerActions.buy("cushion_stack");
    expect(m.takeCompletedSets()).toEqual([]);
    expect(m.getPlayerState().coins).toBe(before - ITEM_CATALOG["cushion_stack"]!.price);
  });
});
