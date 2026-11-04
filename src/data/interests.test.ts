import { describe, expect, test } from "bun:test";
import { ROOMS, type Bulletin, type Song } from "./dorm";
import {
  countSongCommon,
  normalizeBulletin,
  normalizeSongs,
  pinMatches,
  showMatches,
  songMatches,
} from "./interests";
import { coverPixels } from "../lib/coverArt";

const fallback: Bulletin = { pins: [] };

describe("bulletin migration", () => {
  test("old interests + event load with every item preserved as pins", () => {
    const old = {
      interests: ["Into ambient techno lately", "Learning to skate", "Plant dad"],
      event: "Rooftop hang — Fri 8pm",
    };
    const b = normalizeBulletin(old, fallback);
    expect(b.pins).toEqual([
      { kind: "interest", stickerId: "custom", text: "Into ambient techno lately" },
      { kind: "interest", stickerId: "custom", text: "Learning to skate" },
      { kind: "interest", stickerId: "custom", text: "Plant dad" },
      { kind: "ticket", text: "Rooftop hang — Fri 8pm" },
    ]);
  });

  test("an unknown sticker id is kept as a custom sticker, not dropped", () => {
    const b = normalizeBulletin({ pins: [{ kind: "interest", stickerId: "unicycling" }] }, fallback);
    expect(b.pins).toEqual([{ kind: "interest", stickerId: "custom", text: "unicycling" }]);
  });

  test("song notes are capped at 40 characters", () => {
    const [s] = normalizeSongs([{ title: "a", artist: "b", note: "x".repeat(60) }], []);
    expect(s!.note!.length).toBe(40);
  });
});

describe("cover art", () => {
  test("the same song gives the same cover every time", () => {
    const a = coverPixels("Midnight City", "M83", "chill_ambient");
    const b = coverPixels("Midnight City", "M83", "chill_ambient");
    expect(a).toEqual(b);
  });

  test("changing the title changes the cover", () => {
    const a = coverPixels("Midnight City", "M83", "chill_ambient");
    const b = coverPixels("Midnight Town", "M83", "chill_ambient");
    expect(a.pixels.join() === b.pixels.join() && a.palette.join() === b.palette.join()).toBe(false);
  });
});

describe("you have this in common", () => {
  const jordan = ROOMS[2]!;
  const sam = ROOMS[1]!;

  test("matching one of Sam's artists (case/space-insensitive) tags that song", () => {
    const mine: Song[] = [{ title: "Anything", artist: "  mitski " }];
    expect(songMatches(sam.songs, mine)).toEqual([true, false, false, false, false]);
  });

  test("two songs by a shared artist count as one thing in common", () => {
    const mine: Song[] = [{ title: "x", artist: "Daft Punk" }];
    expect(countSongCommon(jordan.songs, mine)).toBe(1);
  });

  test("same sticker id and same pennant text match", () => {
    const mine: Bulletin = {
      pins: [
        { kind: "interest", stickerId: "skating" },
        { kind: "pennant", text: "clay club" },
      ],
    };
    const m = pinMatches(sam.bulletin, mine);
    const matchedKinds = sam.bulletin.pins.filter((_, i) => m[i]).map((p) => p.kind);
    expect(matchedKinds.sort()).toEqual(["interest", "pennant"]);
  });

  test("same show title matches", () => {
    expect(showMatches({ title: "perfect days" }, { title: "Perfect Days" }).title).toBe(true);
  });

  test("Sam's and Jordan's boards show every pin kind", () => {
    for (const r of [sam, jordan]) {
      expect(new Set(r.bulletin.pins.map((p) => p.kind))).toEqual(
        new Set(["interest", "ticket", "polaroid", "pennant", "book"]),
      );
    }
  });
});
