import { beforeAll, describe, expect, test } from "bun:test";

// minimal browser stub so the store can hydrate from localStorage
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

let m: typeof import("./playerStore");
beforeAll(async () => {
  m = await import("./playerStore");
  m.__resetStoreForTests();
  m.hydratePlayerState();
});

describe("normalizeSave", () => {
  test("a current save round-trips unchanged", () => {
    m.playerActions.setPlayerName("Jo");
    m.playerActions.answerDaily("Cozy socks");
    m.playerActions.buy("disco_ball");
    const current = m.getPlayerState();
    // exactly what a cloud load does: parse the persisted JSON, then normalize
    const roundTripped = m.normalizeSave(JSON.parse(JSON.stringify(current)));
    expect(roundTripped).toEqual(current);
  });

  test("persist stamps savedAt and normalizeSave preserves it", () => {
    const before = m.getPlayerState().savedAt;
    m.playerActions.setPlayerName("Jo!");
    const after = m.getPlayerState().savedAt;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(after).toBeGreaterThan(0);
    expect(m.normalizeSave({ savedAt: 123 }).savedAt).toBe(123);
  });

  test("a pre-avatar save migrates the same as read() did: onboarded, default look, news toast", () => {
    const old = {
      coins: 80,
      ownedItemIds: ["bed_basic"],
      roomLayout: [{ itemId: "tv_basic", gx: 5, gy: 1 }],
      mySongs: [{ title: "Old Song", artist: "Old Artist" }],
    };
    const next = m.normalizeSave(old);
    expect(next.onboarded).toBe(true);
    expect(next.avatarNewsSeen).toBe(false);
    expect(next.coins).toBe(80);
    // the TV's old side-wall spot migrates, and the default poster is added
    expect(next.roomLayout.find((p) => p.itemId === "tv_basic")).toMatchObject({ gx: 9, gy: 3 });
    expect(next.roomLayout.some((p) => p.itemId === "poster_default")).toBe(true);
    // pre-quests save: already-done quests tick without rewards
    expect(Array.isArray(next.questsDone)).toBe(true);
    expect(next.savedAt).toBe(0);
  });

  test("an old save migrates identically whether it arrives from localStorage or the cloud", () => {
    const old = { coins: 42, playerName: "  Sam  ", muted: true };
    const direct = m.normalizeSave(old);
    const viaJson = m.normalizeSave(JSON.parse(JSON.stringify(old)));
    expect(viaJson).toEqual(direct);
    expect(direct.coins).toBe(42);
    expect(direct.muted).toBe(true);
  });

  test("hasRealProgress: fresh move-in is not progress; a purchase or 3 days is", () => {
    const fresh = m.normalizeSave({ onboarded: true });
    expect(m.hasRealProgress(fresh)).toBe(false);
    const bought = m.normalizeSave({ onboarded: true, ownedItemIds: ["disco_ball"] });
    expect(m.hasRealProgress(bought)).toBe(true);
    const threeDays = m.normalizeSave({
      onboarded: true,
      dailyAnswers: {
        "2026-11-03": { promptId: "p", answer: "a" },
        "2026-11-04": { promptId: "p", answer: "b" },
        "2026-11-05": { promptId: "p", answer: "c" },
      },
    });
    expect(m.hasRealProgress(threeDays)).toBe(true);
    // skipped move-in (not onboarded) is never real progress, even with a purchase
    const skipped = m.normalizeSave({ onboarded: false, ownedItemIds: ["disco_ball"] });
    expect(m.hasRealProgress(skipped)).toBe(false);
  });
});
