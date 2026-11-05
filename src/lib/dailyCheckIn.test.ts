import { beforeAll, describe, expect, test } from "bun:test";
import { AFFORDABLE_MAX, featuredForToday, ITEM_CATALOG, MAIL_ITEM_IDS } from "../data/items";
import { nextSinceExclusive, PITY_AFTER, rollPackage } from "../data/mail";
import {
  DAILY_COIN_REWARD,
  DAILY_PROMPTS,
  floorSplit,
  residentPick,
  todayKey,
  trimDailyAnswers,
} from "../data/prompts";
import { QUESTS } from "../data/quests";

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

const days = (n: number) =>
  Array.from({ length: n }, (_, i) => todayKey(new Date(2026, 0, 1 + i)));

describe("question of the day", () => {
  test("60 prompts, each with 3–4 options, and the reward is 15", () => {
    expect(DAILY_PROMPTS.length).toBe(60);
    expect(new Set(DAILY_PROMPTS.map((p) => p.id)).size).toBe(60);
    for (const p of DAILY_PROMPTS) {
      expect(p.options.length).toBeGreaterThanOrEqual(3);
      expect(p.options.length).toBeLessThanOrEqual(4);
    }
    expect(DAILY_COIN_REWARD).toBe(15);
  });

  test("the Floor 3 split sums to 100 for every prompt and is stable", () => {
    for (const p of DAILY_PROMPTS) {
      const split = floorSplit(p);
      expect(split.length).toBe(p.options.length);
      expect(split.reduce((a, b) => a + b, 0)).toBe(100);
      expect(floorSplit(p)).toEqual(split);
    }
  });

  test("resident picks are deterministic and differ between residents somewhere", () => {
    let differ = 0;
    for (const p of DAILY_PROMPTS) {
      expect(residentPick("room-2", p)).toBe(residentPick("room-2", p));
      expect(p.options).toContain(residentPick("room-3", p));
      if (residentPick("room-2", p) !== residentPick("room-3", p)) differ++;
    }
    expect(differ).toBeGreaterThan(20);
  });

  test("only the last 30 days of answers are kept", () => {
    const all = Object.fromEntries(days(40).map((d) => [d, { promptId: "mood", answer: "Cozy" }]));
    const kept = Object.keys(trimDailyAnswers(all));
    expect(kept.length).toBe(30);
    expect(kept[0]).toBe(days(40)[10]);
  });
});

describe("mail package", () => {
  test("the roll is seeded by date: same day, same reward", () => {
    for (const d of days(30)) expect(rollPackage(d, 0, [])).toEqual(rollPackage(d, 0, []));
  });

  test("odds land near 60 / 20 / 15 / 5 over many days", () => {
    const n = 4000;
    const count = { coins: 0, postcard: 0, item: 0, jackpot: 0, allFound: 0, gift: 0 };
    for (const d of Array.from({ length: n }, (_, i) => `day-${i}`)) count[rollPackage(d, 0, []).kind]++;
    expect(count.coins / n).toBeGreaterThan(0.55);
    expect(count.coins / n).toBeLessThan(0.65);
    expect(count.postcard / n).toBeGreaterThan(0.16);
    expect(count.item / n).toBeGreaterThan(0.12);
    expect(count.jackpot / n).toBeGreaterThan(0.03);
    expect(count.jackpot / n).toBeLessThan(0.07);
  });

  test("coin packages pay 10–20, jackpots 50, postcards 5", () => {
    for (let i = 0; i < 500; i++) {
      const r = rollPackage(`d${i}`, 0, []);
      if (r.kind === "coins") {
        expect(r.coins).toBeGreaterThanOrEqual(10);
        expect(r.coins).toBeLessThanOrEqual(20);
      }
      if (r.kind === "jackpot") expect(r.coins).toBe(50);
      if (r.kind === "postcard") expect(r.coins).toBe(5);
    }
  });

  test("pity: after 9 packages with no exclusive, the 10th always has one", () => {
    expect(PITY_AFTER).toBe(9);
    for (const d of days(60)) {
      const r = rollPackage(d, 9, []);
      expect(r.kind).toBe("item");
    }
    // the counter climbs on misses and resets on a find
    expect(nextSinceExclusive(3, { kind: "coins", coins: 12 })).toBe(4);
    expect(nextSinceExclusive(9, { kind: "item", itemId: MAIL_ITEM_IDS[0]!, coins: 0 })).toBe(0);
  });

  test("exclusives are never already owned; with all 6 owned the slot pays 25", () => {
    expect(MAIL_ITEM_IDS.length).toBe(6);
    const owned = MAIL_ITEM_IDS.slice(0, 5);
    for (const d of days(40)) {
      const r = rollPackage(d, 9, owned);
      expect(r).toEqual({ kind: "item", itemId: MAIL_ITEM_IDS[5]!, coins: 0 });
      expect(rollPackage(d, 9, MAIL_ITEM_IDS)).not.toHaveProperty("itemId");
    }
    expect(rollPackage(days(1)[0]!, 9, MAIL_ITEM_IDS)).toEqual({ kind: "allFound", coins: 25 });
  });

  test("mail exclusives are never sold", () => {
    for (const id of MAIL_ITEM_IDS) {
      expect(ITEM_CATALOG[id]!.exclusive).toBe("mail");
      expect(ITEM_CATALOG[id]!.unlockedByDefault).toBe(false);
    }
  });
});

describe("today's drop", () => {
  test("every day of the year includes one item at 45 coins or less", () => {
    for (let i = 0; i < 366; i++) {
      const ids = featuredForToday(new Date(2026, 0, 1 + i));
      expect(ids.length).toBe(3);
      expect(ids.some((id) => ITEM_CATALOG[id]!.price <= AFFORDABLE_MAX)).toBe(true);
      expect(ids.every((id) => !ITEM_CATALOG[id]!.exclusive)).toBe(true);
    }
  });
});

describe("welcome quests", () => {
  test("a fresh save reaches 115 coins from the start + daily + quest rewards", () => {
    store.clear();
    m.__resetStoreForTests();
    m.hydratePlayerState();
    expect(m.getPlayerState().coins).toBe(50);
    const questCoins = QUESTS.reduce((a, q) => a + q.coins, 0);
    expect(50 + DAILY_COIN_REWARD + questCoins).toBe(115);
  });

  test("quests pay once and the buy quest gifts the poster", () => {
    store.clear();
    m.__resetStoreForTests();
    store.set("dorm-vibes-player-state", JSON.stringify({ coins: 100, questsDone: [] }));
    m.hydratePlayerState();
    m.playerActions.setRoomLayout(m.getPlayerState().roomLayout);
    expect(m.getPlayerState().coins).toBe(115);
    m.playerActions.setRoomLayout(m.getPlayerState().roomLayout);
    expect(m.getPlayerState().coins).toBe(115);
    m.playerActions.buy("cushion_stack");
    expect(m.getPlayerState().ownedItemIds).toContain("poster_quote");
    expect(m.getPlayerState().coins).toBe(115 - 20);
  });

  test("an old save with purchases gets 'buy' pre-ticked without a second reward", () => {
    store.clear();
    m.__resetStoreForTests();
    store.set(
      "dorm-vibes-player-state",
      JSON.stringify({
        coins: 33,
        ownedItemIds: ["lava_lamp"],
        lastDailyAnswerDate: "2025-12-01",
      }),
    );
    m.hydratePlayerState();
    const s = m.getPlayerState();
    expect(s.questsDone).toContain("buy");
    expect(s.questsDone).toContain("daily");
    expect(s.questsDone).not.toContain("mail");
    expect(s.questsDone).not.toContain("sam");
    expect(s.coins).toBe(33);
    expect(s.ownedItemIds).not.toContain("poster_quote");
    expect(s.dailyAnswers).toEqual({});
    // buying again later doesn't pay the quest a second time
    m.playerActions.buy("cushion_stack");
    expect(m.getPlayerState().ownedItemIds).not.toContain("poster_quote");
    expect(m.getPlayerState().coins).toBe(33 - 20);
  });

  test("the package can only be opened once a day and keeps its reward", () => {
    store.clear();
    m.__resetStoreForTests();
    m.hydratePlayerState();
    const first = m.playerActions.openPackage();
    const coins = m.getPlayerState().coins;
    expect(m.playerActions.openPackage()).toEqual(first);
    expect(m.getPlayerState().coins).toBe(coins);
    expect(m.getPlayerState().lastPackageDate).toBe(todayKey());
    expect(m.getPlayerState().questsDone).toContain("mail");
  });
});
