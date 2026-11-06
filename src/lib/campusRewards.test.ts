import { beforeAll, expect, test } from "bun:test";
import { fortuneForDate } from "../data/campus";
import { todayKey } from "../data/prompts";
const saves = new Map<string, string>();
let m: typeof import("./playerStore");
beforeAll(async () => { m = await import("./playerStore"); });
const reset = () => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: { getItem: (k: string) => saves.get(k) ?? null, setItem: (k: string, v: string) => saves.set(k, v), removeItem: (k: string) => saves.delete(k) }, location: { href: "http://localhost/" }, history: { replaceState: () => {} } };
  saves.clear(); m.__resetStoreForTests(); m.hydratePlayerState();
};
test("fountain is free, pays only its seeded return, once per date even after rehydration", () => {
  reset();
  const before = m.getPlayerState().coins;
  const reward = fortuneForDate(todayKey());
  expect(m.playerActions.tossFountain()).toEqual(reward);
  expect(m.getPlayerState().coins).toBe(before + reward.coins);
  expect(m.getPlayerState().lastFountainDate).toBe(todayKey());
  expect(m.playerActions.tossFountain()).toBe(null);
  m.__resetStoreForTests(); m.hydratePlayerState();
  expect(m.playerActions.tossFountain()).toBe(null);
  expect(m.getPlayerState().coins).toBe(before + reward.coins);
});
test("old saves default safely; first Professor approval is once ever", () => {
  reset();
  expect(m.normalizeSave({}).lastFountainDate).toBe(null);
  expect(m.normalizeSave({}).professorPetted).toBe(false);
  expect(m.playerActions.petProfessor()).toBe(true);
  expect(m.playerActions.petProfessor()).toBe(false);
  m.__resetStoreForTests(); m.hydratePlayerState();
  expect(m.playerActions.petProfessor()).toBe(false);
});