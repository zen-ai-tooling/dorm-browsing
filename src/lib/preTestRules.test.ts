import { describe, expect, test } from "bun:test";
import { nextSaveTrigger, type SaveTrigger } from "./saveNudge";
import { appendFeedback, type QueuedFeedback } from "./feedbackQueue";
import { saturatedPoolColor } from "../game/lightColor";

describe("save reminders", () => {
  const eligible = { userId: "guest", isAnonymous: true, onboarded: true, purchased: true, daysPlayed: 3, shown: [] as SaveTrigger[] };
  test("no session means no reminder", () => {
    expect(nextSaveTrigger({ ...eligible, userId: null })).toBeNull();
  });
  test("each of the three triggers can appear only once", () => {
    const shown: SaveTrigger[] = [];
    for (const expected of ["moveIn", "purchase", "day3"]) {
      const next = nextSaveTrigger({ ...eligible, shown });
      expect(next).toBe(expected);
      if (next) shown.push(next);
    }
    expect(nextSaveTrigger({ ...eligible, shown, daysPlayed: 20 })).toBeNull();
  });
  test("purchase and day-three reminders require their triggers", () => {
    expect(nextSaveTrigger({ ...eligible, shown: ["moveIn"], purchased: false, daysPlayed: 2 })).toBeNull();
    expect(nextSaveTrigger({ ...eligible, shown: ["moveIn", "purchase"], daysPlayed: 2 })).toBeNull();
  });
});
test("feedback queues at most 20 notes without evicting pending feedback", () => {
  const entry: QueuedFeedback = { id: "note", user_id: null, kind: "idea", note: "Keep this", context: null };
  const nineteen = Array.from({ length: 19 }, (_, i) => ({ ...entry, id: String(i) }));
  const twenty = appendFeedback(nineteen, entry);
  expect(twenty?.length).toBe(20);
  expect(appendFeedback(twenty ?? [], { ...entry, id: "21" })).toBeNull();
  expect(twenty?.[0]?.id).toBe("0");
});
test("pool tint uses the specified saturation boost with full brightness", () => {
  expect(saturatedPoolColor(0xffd9a0)).toBe(0xff9922);
  expect(saturatedPoolColor(0x8fb8ff)).toBe(0x168aff);
});