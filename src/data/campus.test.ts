import { describe, expect, test } from "bun:test";
import { CAMPUS_H, CAMPUS_W, openCampusGrid, WAYPOINTS, WAYPOINT_GRAPH, libraryOpen, stringLightsOn, clockAt, leafPhaseForMonth, fortuneForDate, flyersForDate, truckForDate, drinkForDate, FORTUNES, FLYERS } from "./campus";
import { densityRange, studentCount, STUDENTS, overheardFor } from "./students";
import { professorPlace, PROFESSOR_FOLLOW_MS, SQUIRREL_COUNT, PIGEON_COUNT } from "./animals";
import { awayDestination, RESIDENTS } from "./residents";

describe("campus reachability", () => {
  const grid = Array.from({ length: CAMPUS_H }, () => Array(CAMPUS_W).fill(0) as number[]);
  // Existing courtyard floor connects to its new south gate; actual dorm spawn route is checked in the browser.
  for (let y = 23; y <= 27; y++) for (let x = 70; x < 84; x++) { const row = grid[y]; if (row) row[x] = 1; }
  openCampusGrid(grid);
  const seen = new Set<string>(["76,27"]), queue: Array<[number, number]> = [[76, 27]];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (!p) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p[0] + dx, y = p[1] + dy, key = `${x},${y}`;
      if (grid[y]?.[x] === 1 && !seen.has(key)) { seen.add(key); queue.push([x, y]); }
    }
  }
  test("world is 88×60, south gate and every Library Walk point are reachable", () => {
    expect(CAMPUS_H).toBe(60); expect(CAMPUS_W).toBe(88);
    for (const x of [76, 77]) for (let y = 28; y <= 34; y++) expect(seen.has(`${x},${y}`)).toBe(true);
    for (let y = 35; y <= 37; y++) for (let x = 3; x <= 84; x++) expect(seen.has(`${x},${y}`)).toBe(true);
  });
  test("every waypoint/seat is walkable and connected with valid graph neighbors", () => {
    for (const [id, p] of Object.entries(WAYPOINTS)) {
      expect(grid[p.y]?.[p.x]).toBe(1); expect(seen.has(`${p.x},${p.y}`)).toBe(true);
      expect((WAYPOINT_GRAPH[id] ?? []).length).toBeGreaterThan(0);
      for (const neighbor of WAYPOINT_GRAPH[id] ?? []) expect(WAYPOINTS[neighbor] === undefined).toBe(false);
    }
  });
  test("library, fountain and oak trunk block; canopy and north scenery do not become solid ground", () => {
    expect(grid[39]?.[24]).toBe(3); expect(grid[49]?.[56]).toBe(3);
    expect(grid[54]?.[33]).toBe(3); expect(grid[55]?.[43]).toBe(3);
    expect(grid[54]?.[43]).toBe(1); expect(grid[10]?.[1]).toBe(0);
  });
});
test("seasonal oak phases include orange November", () => {
  expect(Array.from({ length: 12 }, (_, i) => leafPhaseForMonth(i + 1))).toEqual(["snow", "snow", "blossom", "blossom", "green", "green", "green", "green", "autumn", "autumn", "autumn", "snow"]);
});
test("library opens 8am–2am, strings run 18:00–01:00", () => {
  expect([1, 2, 7, 8, 23].map(libraryOpen)).toEqual([true, false, false, true, true]);
  expect([0, 1, 17, 18, 23].map(stringLightsOn)).toEqual([true, false, false, true, true]);
});
test("clock uses local hours/minutes, dev 15 shows 3:00", () => {
  const now = new Date(2026, 10, 6, 19, 23);
  expect(clockAt(now, null)).toEqual({ hour: 19, minute: 23 });
  expect(clockAt(now, 15)).toEqual({ hour: 15, minute: 0 });
});
test("student density matches every requested band, maximum ten stable looks", () => {
  expect(STUDENTS.length).toBe(10);
  for (const [hour, range] of [[6, [1, 2]], [8, [5, 8]], [13, [8, 10]], [17, [5, 7]], [21, [3, 5]], [1, [1, 2]], [3, [0, 0]]] as Array<[number, [number, number]]>) {
    expect(densityRange(hour)).toEqual(range);
    const count = studentCount(hour, "2026-11-06"); expect(count).toBeGreaterThanOrEqual(range[0]); expect(count).toBeLessThanOrEqual(range[1]);
    expect(studentCount(hour, "2026-11-06")).toBe(count);
  }
  expect(overheardFor(2, 0)).not.toBe(overheardFor(2, 1));
});
test("date seeded daily food, drink, flyers and forty fortunes", () => {
  expect(FORTUNES.length).toBe(40); expect(FLYERS.length).toBe(30);
  const date = "2026-11-06";
  expect(truckForDate(date)?.name).toBe("Falafel Fellowship");
  expect(drinkForDate(date)).toBe(drinkForDate(date));
  expect(flyersForDate(date)).toEqual(flyersForDate(date)); expect(new Set(flyersForDate(date)).size).toBe(3);
  expect(fortuneForDate(date)).toEqual(fortuneForDate(date));
  let paid = 0;
  for (let i = 1; i <= 1000; i++) {
    const reward = fortuneForDate(`day-${i}`);
    expect(FORTUNES).toContain(reward.text);
    if (reward.coins) { paid++; expect(reward.coins).toBeGreaterThanOrEqual(3); expect(reward.coins).toBeLessThanOrEqual(10); }
  }
  expect(paid).toBeGreaterThan(250); expect(paid).toBeLessThan(350);
});
test("Professor sleeps in lounge 22–07 and follows for eight seconds", () => {
  expect([23, 3, 6, 7, 13, 20].map(professorPlace)).toEqual(["lounge", "lounge", "lounge", "quad", "quad", "courtyard"]);
  expect(PROFESSOR_FOLLOW_MS).toBe(8000); expect(SQUIRREL_COUNT).toBe(3); expect(PIGEON_COUNT).toBeGreaterThanOrEqual(4); expect(PIGEON_COUNT).toBeLessThanOrEqual(6);
});
test("resident destinations are real: library, west arts exit and east run exit", () => {
  expect(awayDestination("jordan", 14)).toEqual(WAYPOINTS["library"]);
  expect(awayDestination("jordan", 7)).toEqual(WAYPOINTS["east"]);
  expect(awayDestination("sam", 14)).toEqual(WAYPOINTS["west"]);
  expect(RESIDENTS.sam.anchors.courtyard).toEqual({ ...WAYPOINTS["bench0"], facing: "up" });
});