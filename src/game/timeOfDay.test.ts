import { describe, expect, test } from "bun:test";
import { phaseFor } from "./timeOfDay";

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m);

describe("phaseFor (local hours)", () => {
  test("morning is 6:00–10:00", () => {
    expect(phaseFor(at(6))).toBe("morning");
    expect(phaseFor(at(9, 59))).toBe("morning");
  });
  test("day is 10:00–17:00", () => {
    expect(phaseFor(at(10))).toBe("day");
    expect(phaseFor(at(16, 59))).toBe("day");
  });
  test("golden hour is 17:00–20:00", () => {
    expect(phaseFor(at(17))).toBe("golden");
    expect(phaseFor(at(19, 59))).toBe("golden");
  });
  test("night is 20:00–6:00", () => {
    expect(phaseFor(at(20))).toBe("night");
    expect(phaseFor(at(0))).toBe("night");
    expect(phaseFor(at(5, 59))).toBe("night");
  });
});
