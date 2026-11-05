import { beforeAll, describe, expect, test } from "bun:test";
import {
  accentTintFor,
  baseTintFor,
  displayTintFor,
  ITEM_CATALOG,
  lightColorFor,
  mixColor,
  RECOLOR_COST,
  RECOLORABLE_IDS,
  recolorCost,
} from "../data/items";
import { DOOR_DEFAULT, DOOR_STICKER_MAX, doorStickerSlots, normalizeDoor, PLATE_MAX } from "../data/door";
import { MOODS } from "../data/dorm";

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

// a save from before Iteration 28: no floor, no door, the couch placed with no colour
store.set(
  "dorm-vibes-player-state",
  JSON.stringify({
    coins: 7,
    onboarded: true,
    ownedItemIds: ["chair_lounge"],
    roomLayout: [
      { itemId: "chair_lounge", gx: 1, gy: 5 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
    ],
  }),
);

let m: typeof import("./playerStore");
beforeAll(async () => {
  m = await import("./playerStore");
  m.__resetStoreForTests();
  m.hydratePlayerState();
});

const ROSE = 0xd88a9a;
const TEAL = 0x4f9a9a;

describe("displayTintFor precedence", () => {
  test("placed tint beats catalog tint, catalog beats mood", () => {
    const rug = ITEM_CATALOG.rug_shag!; // has its own catalog tint
    expect(displayTintFor(rug, "chill_ambient", ROSE)).toBe(ROSE);
    expect(displayTintFor(rug, "chill_ambient")).toBe(rug.tint);
  });
  test("a poster with no colour wears the mood accent (Original)", () => {
    const poster = ITEM_CATALOG.poster_default!;
    expect(displayTintFor(poster, "cozy_soft")).toBe(mixColor(MOODS.cozy_soft.posterAccent, 0xffffff, 0.32));
    expect(displayTintFor(poster, "cozy_soft", TEAL)).toBe(TEAL);
  });
  test("accent items tint only the overlay; the base keeps its baked look", () => {
    const bed = ITEM_CATALOG.bed_basic!;
    expect(baseTintFor(bed, "chill_ambient", ROSE)).toBeUndefined();
    expect(accentTintFor(bed, ROSE)).toBe(ROSE);
    expect(accentTintFor(bed, undefined)).toBeUndefined();
  });
  test("a recolored lamp's light mixes 40% toward its shade", () => {
    const lamp = ITEM_CATALOG.lava_lamp!;
    expect(lightColorFor(lamp, ROSE)).toBe(mixColor(lamp.light!.color, ROSE, 0.4));
    expect(lightColorFor(lamp, undefined)).toBe(lamp.light!.color);
  });
  test("at least 15 items are recolorable", () => {
    expect(RECOLORABLE_IDS.length).toBeGreaterThanOrEqual(15);
    expect(ITEM_CATALOG.desk_basic!.recolor).toBeUndefined();
  });
});

describe("recolor charging", () => {
  test("a new colour costs 5, Original and the same colour are free", () => {
    expect(RECOLOR_COST).toBe(5);
    expect(recolorCost(undefined, ROSE)).toBe(5);
    expect(recolorCost(ROSE, ROSE)).toBe(0);
    expect(recolorCost(ROSE, null)).toBe(0);
  });
  test("recolorPlaced charges once, Original refunds nothing and costs nothing", () => {
    expect(m.getPlayerState().coins).toBe(7);
    expect(m.playerActions.recolorPlaced(0, ROSE)).toBe(true);
    expect(m.getPlayerState().coins).toBe(2);
    expect(m.getPlayerState().roomLayout[0]!.tint).toBe(ROSE);
    expect(m.playerActions.recolorPlaced(0, ROSE)).toBe(true);
    expect(m.getPlayerState().coins).toBe(2);
    expect(m.playerActions.recolorPlaced(0, null)).toBe(true);
    expect(m.getPlayerState().coins).toBe(2);
    expect(m.getPlayerState().roomLayout[0]!.tint).toBeUndefined();
  });
  test("can't afford: no colour change, no charge", () => {
    expect(m.playerActions.recolorPlaced(1, TEAL)).toBe(false);
    expect(m.getPlayerState().coins).toBe(2);
    expect(m.getPlayerState().roomLayout[1]!.tint).toBeUndefined();
  });
  test("off-palette colours and non-recolorable items are rejected", () => {
    expect(m.playerActions.recolorPlaced(0, 0x123456)).toBe(false);
  });
});

describe("door + floor migration", () => {
  test("older saves load with today's look", () => {
    const s = m.getPlayerState();
    expect(s.myFloorId).toBe("floor_checker");
    expect(s.door.frameColor).toBeNull();
    expect(s.door.plateText).toBeNull();
    expect(s.door.plateStyle).toBe("cream");
    expect(s.door.boardMode).toBe("answer");
    expect(s.door.matId).toBe("mat_plain");
  });
  test("normalizeDoor clamps text, caps stickers at 4, drops unknown + unowned picks", () => {
    const d = normalizeDoor(
      {
        plateText: "x".repeat(40),
        plateStyle: "glitter",
        stickers: ["vinyl", "coffee", "chess", "boba", "ramen", "nope"],
        frameColor: 0x123456,
        matId: "mat_cat",
      },
      [],
    );
    expect(d.plateText!.length).toBe(PLATE_MAX);
    expect(d.plateStyle).toBe("cream");
    expect(d.stickers).toEqual(["vinyl", "coffee", "chess", "boba"]);
    expect(d.frameColor).toBeNull();
    expect(d.matId).toBe("mat_plain");
    expect(normalizeDoor(undefined)).toEqual(DOOR_DEFAULT);
  });
  test("an unowned floor can't be applied; the free checker always can", () => {
    expect(m.playerActions.setFloor("floor_oak")).toBe(false);
    expect(m.getPlayerState().myFloorId).toBe("floor_checker");
  });
  test("a door change is news for each resident exactly once", () => {
    expect(m.playerActions.setDoor({ plateStyle: "neon" })).toBe(true);
    const s = m.getPlayerState();
    expect(s.doorLastChange).toBe("neon");
    expect(s.doorVersion).toBeGreaterThan(s.doorSeen.sam);
    m.playerActions.markDoorSeen("sam");
    expect(m.getPlayerState().doorSeen.sam).toBe(m.getPlayerState().doorVersion);
    expect(m.getPlayerState().doorSeen.jordan).toBeLessThan(m.getPlayerState().doorVersion);
  });
});

describe("door sticker slots", () => {
  test("4 slots, all inside the face tile left of the frame, never overlapping", () => {
    const faceLeft = 320; // tile 10
    const jambLeft = 352 - 6; // openL - 6
    const faceTop = 512; // row 16
    const slots = doorStickerSlots(faceLeft, jambLeft, faceTop);
    expect(slots.length).toBe(DOOR_STICKER_MAX);
    for (const s of slots) {
      expect(s.x).toBeGreaterThanOrEqual(faceLeft);
      expect(s.x + s.w).toBeLessThanOrEqual(jambLeft);
      expect(s.y).toBeGreaterThanOrEqual(faceTop);
      expect(s.y + s.h).toBeLessThanOrEqual(faceTop + 64);
    }
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]!;
        const b = slots[j]!;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
  });
});
