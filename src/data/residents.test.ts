import { describe, expect, test } from "bun:test";
import { ROOMS } from "./dorm";
import { ITEM_CATALOG, isShopItem, type Rotation } from "./items";
import { canPlaceIn } from "./placement";
import {
  blockAt,
  giftsUnlocked,
  knockResponse,
  nextBackHour,
  pickLine,
  RESIDENTS,
  roomRemark,
  type TalkContext,
} from "./residents";

const ctx = (over: Partial<TalkContext> = {}): TalkContext => ({
  hour: 9,
  dailyAnswer: null,
  theirDaily: null,
  commonArtist: null,
  commonInterest: null,
  newestItem: null,
  outfit: null,
  ...over,
});

describe("seed rooms", () => {
  test("every seed layout passes canPlaceIn", () => {
    for (const room of ROOMS) {
      const placed: typeof room.layout = [];
      for (const p of room.layout) {
        expect({ room: room.id, item: p.itemId, ok: canPlaceIn(placed, p.itemId, p.gx, p.gy, (p.rotation ?? 0) as Rotation) }).toEqual({
          room: room.id,
          item: p.itemId,
          ok: true,
        });
        placed.push(p);
      }
    }
  });

  test("Sam and Jordan each keep exactly one songs / watching / bulletin / companion piece", () => {
    for (const room of ROOMS.slice(1)) {
      const kinds = room.layout
        .filter((p) => !p.ambient)
        .map((p) => ITEM_CATALOG[p.itemId]!.interactive)
        .filter((k) => k && k !== "art");
      expect(kinds.sort()).toEqual(["bulletin", "companion", "songs", "watching"]);
    }
  });

  test("moods match the people: Sam cozy, Jordan energetic", () => {
    expect(ROOMS[1]!.mood).toBe("cozy_soft");
    expect(ROOMS[2]!.mood).toBe("energetic_dance");
  });

  test("resident-only pieces and gifts are never sold", () => {
    for (const id of ["pottery_wheel", "clay_shelf", "skateboard_wall", "polaroid_frame", "gift_clay_bowl", "dj_decks", "dumbbell_rack", "gift_mixtape"])
      expect(isShopItem(ITEM_CATALOG[id]!)).toBe(false);
  });
});

describe("schedules", () => {
  test("every hour of the day has exactly one block for each resident", () => {
    for (const r of Object.values(RESIDENTS))
      for (let h = 0; h < 24; h++) expect(r.schedule.filter((b) => h >= b.from && h < b.to).length).toBe(1);
  });

  test("the table: Sam 9am kitchen, 2pm away at the clay studio, 3am asleep; Jordan 7am on a run, 6pm at home", () => {
    expect(blockAt("sam", 9).place).toBe("kitchen");
    expect(blockAt("sam", 14).awayNote).toBe("at the clay studio");
    expect(blockAt("sam", 3).place).toBe("bed");
    expect(blockAt("jordan", 7).awayNote).toBe("out on a run");
    expect(blockAt("jordan", 18).place).toBe("room");
    expect(blockAt("jordan", 20).place).toBe("lounge");
  });

  test("next time back: Sam away at 2pm → 5pm; Jordan on a run at 7am → 8am, at the library → 5pm", () => {
    expect(nextBackHour("sam", 14)).toBe(17);
    expect(nextBackHour("jordan", 7)).toBe(8);
    expect(nextBackHour("jordan", 15)).toBe(17);
  });

  test("no two residents share an anchor tile in the same hour", () => {
    for (let h = 0; h < 24; h++) {
      const a = blockAt("sam", h);
      const b = blockAt("jordan", h);
      if (a.place === "away" || b.place === "away" || a.place !== b.place) continue;
      const ta = RESIDENTS.sam.anchors[a.place as keyof typeof RESIDENTS.sam.anchors];
      const tb = RESIDENTS.jordan.anchors[b.place as keyof typeof RESIDENTS.jordan.anchors];
      expect({ hour: h, same: ta.x === tb.x && ta.y === tb.y }).toEqual({ hour: h, same: false });
    }
  });

  test("knocking: home, asleep and away give three different answers", () => {
    expect(knockResponse("sam", 23).kind).toBe("in");
    expect(knockResponse("sam", 3).kind).toBe("asleep");
    const away = knockResponse("sam", 14);
    expect(away.kind).toBe("away");
    expect(away.text).toContain("back around 5pm");
  });
});

describe("dialogue", () => {
  test("lines about you come first, starting with your daily answer", () => {
    const l = pickLine("jordan", ctx({ dailyAnswer: "Ramen run" }), []);
    expect(l.id).toBe("you-daily");
    expect(l.text).toContain("Ramen run");
  });

  test("never repeats a line on the same day", () => {
    const seen: string[] = [];
    const c = ctx({ dailyAnswer: "Cozy", commonArtist: "Japanese Breakfast", newestItem: "Lava Lamp", outfit: "Varsity Jacket" });
    for (let i = 0; i < 12; i++) {
      const l = pickLine("sam", c, seen);
      expect(seen).not.toContain(l.id);
      seen.push(l.id);
    }
    expect(seen.slice(0, 4)).toEqual(["you-daily", "you-common", "you-item", "you-outfit"]);
    expect(seen[4]!.startsWith("act-")).toBe(true);
  });

  test("with nothing about you, the line fits what they're doing", () => {
    expect(pickLine("sam", ctx({ hour: 9 }), []).text.toLowerCase()).toContain("pour-over");
  });

  test("the door visit talks about something actually in your room", () => {
    expect(roomRemark("sam", { plants: 0, lights: 0, newestItem: "Lava Lamp", wallpaper: null, mood: "cozy soft" })).toContain("lava lamp");
    expect(roomRemark("jordan", { plants: 3, lights: 0, newestItem: null, wallpaper: null, mood: "cozy soft" })).toContain("3 plants");
  });

  test("gifts unlock at 3, 6 and 10 hearts, once each", () => {
    expect(giftsUnlocked("sam", 2, 3)).toEqual(["gift_clay_bowl"]);
    expect(giftsUnlocked("sam", 3, 4)).toEqual([]);
    expect(giftsUnlocked("jordan", 9, 10)).toEqual(["dj_decks"]);
  });
});
