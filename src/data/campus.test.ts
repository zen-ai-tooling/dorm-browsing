import { describe, expect, test } from "bun:test";
import { CAMPUS_H, CAMPUS_W, CAMPUS_PROPS, LIBRARY_AXIS, openCampusGrid, WAYPOINTS, WAYPOINT_GRAPH, libraryOpen, stringLightsOn, clockAt, bellStrikeCount, leafPhaseForMonth, fortuneForDate, flyersForDate, truckForDate, drinkForDate, FORTUNES, FLYERS, FRONT_PATH, chalkForDate, CHALK_DRAWINGS, bookForDate, BOOKS, gardenStage, GARDEN_STAGES, firePitLit, bbqOn, volleyballOn } from "./campus";
import { densityRange, studentCount, STUDENTS, overheardFor } from "./students";
import { professorPlace, PROFESSOR_FOLLOW_MS, SQUIRREL_COUNT, PIGEON_COUNT } from "./animals";
import { awayDestination, blockAt, RESIDENTS } from "./residents";

/** BFS shortest-path length on a 0/1/3 grid (1 = walkable) */
const routeLength = (grid: number[][], from: [number, number], to: [number, number]) => {
  const dist = new Map<string, number>([[`${from[0]},${from[1]}`, 0]]);
  const queue: Array<[number, number]> = [from];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    const d = dist.get(`${p[0]},${p[1]}`)!;
    if (p[0] === to[0] && p[1] === to[1]) return d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p[0] + dx, y = p[1] + dy, key = `${x},${y}`;
      if (grid[y]?.[x] === 1 && !dist.has(key)) { dist.set(key, d + 1); queue.push([x, y]); }
    }
  }
  return Infinity;
};

describe("campus reachability", () => {
  const grid = Array.from({ length: CAMPUS_H }, () => Array(CAMPUS_W).fill(0) as number[]);
  // Existing courtyard floor connects to its new south gate; actual dorm spawn route is checked in the browser.
  for (let y = 23; y <= 27; y++) for (let x = 70; x < 84; x++) { const row = grid[y]; if (row) row[x] = 1; }
  // hallway floor + the front-entrance doorway, so the front route can be measured
  for (let y = 17; y <= 21; y++) for (let x = 2; x < 68; x++) { const row = grid[y]; if (row) row[x] = 1; }
  for (const x of [FRONT_PATH.x0, FRONT_PATH.x1]) { const row = grid[22]; if (row) row[x] = 1; }
  openCampusGrid(grid);
  const seen = new Set<string>(["76,27"]), queue: Array<[number, number]> = [[76, 27]];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (!p) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = p[0] + dx, y = p[1] + dy, key = `${x},${y}`;
      if (grid[y]?.[x] === 1 && !seen.has(key)) { seen.add(key); queue.push([x, y]); }
    }
  }
  test("world is 88×66, south gate and every Library Walk point are reachable", () => {
    expect(CAMPUS_H).toBe(66); expect(CAMPUS_W).toBe(88);
    for (const x of [76, 77]) for (let y = 28; y <= 34; y++) expect(seen.has(`${x},${y}`)).toBe(true);
    for (let y = 35; y <= 37; y++) for (let x = 3; x <= 84; x++) expect(seen.has(`${x},${y}`)).toBe(true);
  });
  test("front entrance: path tiles walkable, connected to the Walk, route from Your Room's door to the library steps ≤ 80 tiles", () => {
    for (let y = FRONT_PATH.y0; y <= FRONT_PATH.y1; y++)
      for (const x of [FRONT_PATH.x0, FRONT_PATH.x1]) {
        expect(grid[y]?.[x]).toBe(1);
        expect(seen.has(`${x},${y}`)).toBe(true);
      }
    expect(WAYPOINTS["frontDoor"]).toEqual({ x: 24, y: 34 });
    expect(WAYPOINT_GRAPH["frontDoor"]).toContain("walkWest");
    expect(WAYPOINT_GRAPH["walkWest"]).toContain("frontDoor");
    const route = routeLength(grid, [12, 18], [WAYPOINTS["steps"]!.x, WAYPOINTS["steps"]!.y]);
    expect(route).toBeLessThanOrEqual(80);
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
    expect(grid[55]?.[33]).toBe(3); expect(grid[61]?.[52]).toBe(3);
    expect(grid[60]?.[52]).toBe(1); expect(grid[10]?.[1]).toBe(0);
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
  expect(bellStrikeCount(15)).toBe(3);
  expect([1, 2, 12, 23].map(bellStrikeCount)).toEqual([1, 2, 3, 3]);
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
test("library axis stays clear: no prop or oak canopy covers doors, steps or the walk down the Quad", () => {
  for (const p of CAMPUS_PROPS) {
    // the oak is drawn at 65%: canopy spans ~2 tiles out and ~3 up from the trunk
    const canopy = p.id === "oak" ? { x0: p.x - 2, x1: p.x + 2, y0: p.y - 3 } : { x0: p.x, x1: p.x + p.w - 1, y0: p.y };
    const overlapsX = canopy.x1 >= LIBRARY_AXIS.x0 && canopy.x0 <= LIBRARY_AXIS.x1;
    expect(overlapsX && p.y + p.h - 1 >= LIBRARY_AXIS.y0).toBe(false);
  }
  const oak = CAMPUS_PROPS.find((p) => p.id === "oak");
  expect(oak && [oak.x, oak.y]).toEqual([52, 61]);
  // canopy top clears the steps' bottom row (51) by at least a tile
  expect(oak!.y - 3).toBeGreaterThanOrEqual(53);
  // nothing sits under the trunk's footprint
  for (const p of CAMPUS_PROPS) {
    if (p.id === "oak") continue;
    const under = oak!.x >= p.x && oak!.x < p.x + p.w && oak!.y >= p.y && oak!.y < p.y + p.h;
    expect(under).toBe(false);
  }
});
test("daily chalk and little-free-library books are date-seeded and stable", () => {
  expect(CHALK_DRAWINGS.length).toBe(8);
  expect(new Set(CHALK_DRAWINGS.map((c) => c.id)).size).toBe(8);
  expect(chalkForDate("2026-11-07")).toEqual(chalkForDate("2026-11-07"));
  expect(BOOKS.length).toBeGreaterThanOrEqual(30);
  expect(bookForDate("2026-11-07")).toEqual(bookForDate("2026-11-07"));
  expect(BOOKS.some((b) => b.title === bookForDate("2026-11-07").title)).toBe(true);
});
test("garden beds advance one stage per real day, staggered per bed", () => {
  expect(GARDEN_STAGES).toEqual(["sprout", "leafy", "flowering", "ready"]);
  for (let bed = 0; bed < 3; bed++) {
    const stages = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"].map((d) => gardenStage(bed, d));
    for (let i = 1; i < stages.length; i++)
      expect(GARDEN_STAGES.indexOf(stages[i]!)).toBe((GARDEN_STAGES.indexOf(stages[i - 1]!) + 1) % 4);
  }
  expect(gardenStage(0, "2026-11-07")).not.toBe(gardenStage(1, "2026-11-07"));
});
test("weekly rhythm: fire pit lit 18–01, BBQ Saturday 12–18, volleyball Sunday 13–17", () => {
  expect([17, 18, 23, 0, 1].map(firePitLit)).toEqual([false, true, true, true, false]);
  expect(bbqOn(6, 13)).toBe(true); expect(bbqOn(6, 18)).toBe(false); expect(bbqOn(5, 13)).toBe(false);
  expect(volleyballOn(0, 14)).toBe(true); expect(volleyballOn(0, 17)).toBe(false); expect(volleyballOn(6, 14)).toBe(false);
});
test("weekend schedule overrides: fire pit Fri–Sun 20–22, Sam gardens Sat/Sun 10–12, weekdays unchanged", () => {
  expect(blockAt("sam", 21, 6).place).toBe("firepit");
  expect(blockAt("jordan", 21, 0).place).toBe("firepit");
  expect(blockAt("jordan", 20, 5).place).toBe("firepit");
  expect(blockAt("sam", 11, 0).place).toBe("garden");
  expect(blockAt("sam", 11, 6).place).toBe("garden");
  expect(blockAt("jordan", 11, 6).place).toBe("study");
  expect(blockAt("sam", 21, 2).place).toBe("lounge");
  expect(blockAt("sam", 11, 3).place).toBe("study");
  expect(blockAt("sam", 19, 6).place).toBe("lounge");
});
