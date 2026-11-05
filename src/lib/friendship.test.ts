import { beforeAll, describe, expect, test } from "bun:test";
import { todayKey } from "../data/prompts";

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
});

const KEY = "dorm-vibes-player-state";
const load = (save: object | null) => {
  store.clear();
  if (save) store.set(KEY, JSON.stringify(save));
  m.__resetStoreForTests();
  m.hydratePlayerState();
  return m.getPlayerState();
};

describe("friendship", () => {
  test("talking adds one heart per day, however many times you talk", () => {
    load({ onboarded: true });
    expect(m.playerActions.talk("sam", "act-0")).toBe(true);
    expect(m.playerActions.talk("sam", "fill-0")).toBe(false);
    const s = m.getPlayerState();
    expect(s.friendship.sam).toBe(1);
    expect(s.linesSeen.ids.sam).toEqual(["act-0", "fill-0"]);
  });

  test("reaching 3 hearts mails Sam's clay bowl in place of the daily roll", () => {
    load({ onboarded: true, friendship: { sam: 2, jordan: 0 }, lastTalkDate: { sam: "2000-01-01", jordan: null } });
    m.playerActions.talk("sam", "act-0");
    expect(m.getPlayerState().pendingGifts).toEqual([{ from: "sam", itemId: "gift_clay_bowl" }]);
    const reward = m.playerActions.openPackage();
    expect(reward).toEqual({ kind: "gift", from: "Sam", itemId: "gift_clay_bowl", coins: 0 });
    const s = m.getPlayerState();
    expect(s.ownedItemIds).toContain("gift_clay_bowl");
    expect(s.pendingGifts).toEqual([]);
    expect(s.lastPackageDate).toBe(todayKey());
  });

  test("hearts cap at 10 and never go down", () => {
    load({ onboarded: true, friendship: { sam: 10, jordan: 4 }, lastTalkDate: { sam: null, jordan: null } });
    m.playerActions.talk("sam", "act-1");
    expect(m.getPlayerState().friendship).toEqual({ sam: 10, jordan: 4 });
  });

  test("older saves start at zero hearts", () => {
    const s = load({ coins: 10 });
    expect(s.friendship).toEqual({ sam: 0, jordan: 0 });
    expect(s.pendingGifts).toEqual([]);
  });
});
