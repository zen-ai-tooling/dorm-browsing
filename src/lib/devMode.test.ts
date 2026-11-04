import { beforeAll, describe, expect, test } from "bun:test";

// minimal browser stub so the store can hydrate dev mode from `?dev=1`
const store = new Map<string, string>();
let replacedUrl = "";
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  location: { href: "http://localhost/?dev=1", reload: () => {} },
  history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => (replacedUrl = url) },
};

let m: typeof import("./playerStore");
beforeAll(async () => {
  m = await import("./playerStore");
  m.__resetStoreForTests();
  m.hydratePlayerState();
  m.hydrateDevMode();
});

describe("dev mode", () => {
  test("?dev=1 turns dev mode on with unlimited, stores the key, and strips the param", () => {
    expect(store.has("dorm-vibes-dev")).toBe(true);
    expect(m.isUnlimited()).toBe(true);
    expect(replacedUrl).toBe("/");
  });

  test("unlimited buy grants the item without subtracting coins", () => {
    const before = m.getPlayerState().coins;
    expect(m.canAfford(999_999)).toBe(true);
    expect(m.playerActions.buy("disco_ball")).toBe(true);
    expect(m.getPlayerState().coins).toBe(before);
    expect(m.getPlayerState().ownedItemIds.includes("disco_ball")).toBe(true);
  });

  test("Coins → 0 zeroes the real balance and turns unlimited off", () => {
    m.devActions.zeroCoins();
    expect(m.getPlayerState().coins).toBe(0);
    expect(m.isUnlimited()).toBe(false);
    expect(m.canAfford(1)).toBe(false);
  });

  test("Reset purchases drops placed items that are no longer owned", () => {
    m.devActions.unlockAll();
    m.playerActions.setRoomLayout([...m.getPlayerState().roomLayout, { itemId: "disco_ball", gx: 5, gy: 4 }]);
    m.devActions.resetPurchases();
    const s = m.getPlayerState();
    expect(s.ownedItemIds.includes("disco_ball")).toBe(false);
    expect(s.roomLayout.some((p) => p.itemId === "disco_ball")).toBe(false);
  });

  test("Reset streak keeps the longest streak", () => {
    m.devActions.allowDailyAgain();
    m.playerActions.answerDaily("Cozy");
    const longest = m.getPlayerState().longestStreak;
    m.devActions.resetStreak();
    expect(m.getPlayerState().currentStreak).toBe(0);
    expect(m.getPlayerState().longestStreak).toBe(longest);
  });
});

describe("hidden dev toggle", () => {
  test("toggleEnabled turns dev mode off, then back on with unlimited", () => {
    m.devActions.toggleEnabled();
    expect(store.has("dorm-vibes-dev")).toBe(false);
    expect(m.isUnlimited()).toBe(false);
    expect(m.devActions.toggleEnabled()).toBe(true);
    expect(store.has("dorm-vibes-dev")).toBe(true);
    expect(m.isUnlimited()).toBe(true);
  });
});
