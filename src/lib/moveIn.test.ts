import { beforeAll, describe, expect, test } from "bun:test";
import {
  DEFAULT_LOOK,
  effectiveLook,
  lookHash,
  NAME_MAX,
  normalizeAvatar,
  randomLook,
  roomNameFor,
  type AvatarLook,
} from "../data/avatar";
import { featuredForToday, ITEM_CATALOG, OUTFIT_ITEM_IDS } from "../data/items";
import { charPixels, CHAR_H, CHAR_W, DIRS } from "../game/avatarDraw";

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

describe("avatar defaults + migration", () => {
  test("a new save gets a random valid look and runs Move-In Day", () => {
    const s = load(null);
    expect(s.onboarded).toBe(false);
    expect(s.playerName).toBe("");
    expect(normalizeAvatar(s.avatar)).toEqual(s.avatar);
    expect(s.avatar.outfitItemId).toBeUndefined();
  });

  test("a save from before avatars keeps the old look, skips move-in and gets the toast once", () => {
    const s = load({ coins: 80, ownedItemIds: [] });
    expect(s.avatar).toEqual(DEFAULT_LOOK);
    expect(s.onboarded).toBe(true);
    expect(s.avatarNewsSeen).toBe(false);
    m.playerActions.markAvatarNewsSeen();
    expect(load(JSON.parse(store.get(KEY)!)).avatarNewsSeen).toBe(true);
  });

  test("broken avatar fields fall back field by field", () => {
    const look = normalizeAvatar({ skin: 99, hairStyle: "mohawk", hairColor: 3, top: { style: "tee", color: -1 } });
    expect(look.skin).toBe(DEFAULT_LOOK.skin);
    expect(look.hairStyle).toBe(DEFAULT_LOOK.hairStyle);
    expect(look.hairColor).toBe(3);
    expect(look.top).toEqual({ style: "tee", color: DEFAULT_LOOK.top.color });
    expect(look.bottom).toEqual(DEFAULT_LOOK.bottom);
  });

  test("random looks always normalize to themselves", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const l = randomLook(rand);
      expect(normalizeAvatar(l)).toEqual(l);
    }
  });

  test("names cap at 16 characters and the door reads \"{name}'s Room\"", () => {
    load(null);
    m.playerActions.setPlayerName("Alexandria-Marie Lopez");
    expect(m.getPlayerState().playerName.length).toBe(NAME_MAX);
    expect(roomNameFor("Joe")).toBe("Joe's Room");
    expect(roomNameFor("  ")).toBe("Your Room");
  });
});

describe("outfits", () => {
  test("6 outfits at the listed prices, none in the affordable room-item drop", () => {
    const prices = Object.fromEntries(OUTFIT_ITEM_IDS.map((id) => [ITEM_CATALOG[id]!.name, ITEM_CATALOG[id]!.price]));
    expect(prices).toEqual({
      "Floor 3 Hoodie": 30,
      "Varsity Jacket": 60,
      Overalls: 45,
      "Band Tee + Beanie": 40,
      "Bucket Hat Fit": 35,
      "Graduation Gown": 120,
    });
    for (let d = 0; d < 366; d++)
      for (const id of featuredForToday(new Date(2026, 0, 1 + d))) expect(ITEM_CATALOG[id]!.category).not.toBe("outfit");
  });

  test("a worn outfit overrides top, bottom and accessory but keeps skin and hair", () => {
    const mine: AvatarLook = { ...DEFAULT_LOOK, skin: 4, hairStyle: "curly", accessory: "glasses" };
    const worn = effectiveLook({ ...mine, outfitItemId: "outfit_band_tee" }, ITEM_CATALOG);
    const o = ITEM_CATALOG.outfit_band_tee!.outfit!;
    expect(worn.top).toEqual(o.top);
    expect(worn.bottom).toEqual(o.bottom);
    expect(worn.accessory).toBe("beanie");
    expect(worn.skin).toBe(4);
    expect(worn.hairStyle).toBe("curly");
    expect(effectiveLook(mine, ITEM_CATALOG)).toEqual(mine);
    expect(lookHash(worn)).not.toBe(lookHash(mine));
  });

  test("you can only wear outfits you own; 'None' goes back to your pieces", () => {
    load(null);
    expect(m.playerActions.wearOutfit("outfit_floor3_hoodie")).toBe(false);
    const dev = m.devActions;
    dev.toggleEnabled();
    dev.addCoins(100);
    expect(m.playerActions.buy("outfit_floor3_hoodie")).toBe(true);
    expect(m.playerActions.wearOutfit("outfit_floor3_hoodie")).toBe(true);
    expect(m.getPlayerState().avatar.outfitItemId).toBe("outfit_floor3_hoodie");
    m.playerActions.wearOutfit(null);
    expect(m.getPlayerState().avatar.outfitItemId).toBeUndefined();
    dev.toggleEnabled();
  });
});

describe("Move-In Day unpack", () => {
  test("3 stickers replace the interest pins; the song becomes #1", () => {
    load(null);
    m.playerActions.unpack(["vinyl", "house_music", "skating"], { title: "Pink + White", artist: "Frank Ocean" });
    const s = m.getPlayerState();
    const interests = s.myBulletin.pins.filter((p) => p.kind === "interest");
    expect(interests.map((p) => (p.kind === "interest" ? p.stickerId : ""))).toEqual(["vinyl", "house_music", "skating"]);
    expect(s.myBulletin.pins.some((p) => p.kind === "ticket")).toBe(true);
    expect(s.mySongs[0]).toEqual({ title: "Pink + White", artist: "Frank Ocean" });
    m.playerActions.finishMoveIn();
    expect(m.getPlayerState().onboarded).toBe(true);
  });
});

describe("avatar sprite", () => {
  test("every hair style draws all 4 directions × 3 steps inside the 16×21 canvas", () => {
    for (const hairStyle of ["short", "long", "buzz", "curly", "bun", "bob"] as const)
      for (const dir of DIRS)
        for (const step of [0, 1, 2]) {
          const buf = charPixels({ ...DEFAULT_LOOK, hairStyle }, dir, step);
          expect(buf.length).toBe(CHAR_H);
          expect(buf.every((r) => r.length === CHAR_W)).toBe(true);
          expect(buf.flat().filter((c) => c !== undefined).length).toBeGreaterThan(120);
        }
  });

  test("right is the mirror of left", () => {
    const look = { ...DEFAULT_LOOK, hairStyle: "long" as const, accessory: "headphones" as const };
    const l = charPixels(look, "left", 0);
    const r = charPixels(look, "right", 0);
    expect(r.map((row) => [...row].reverse())).toEqual(l);
  });
});
