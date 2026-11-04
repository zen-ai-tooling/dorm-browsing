import { MAIL_ITEM_IDS } from "./items";
import { seedHash, seededRandom } from "./prompts";

/** after this many packages with no exclusive, the next one is guaranteed to have one */
export const PITY_AFTER = 9;
export const ALL_FOUND_COINS = 25;
export const JACKPOT_COINS = 50;
export const POSTCARD_COINS = 5;

export type PackageReward =
  | { kind: "coins"; coins: number }
  | { kind: "postcard"; from: string; line: string; coins: number }
  | { kind: "item"; itemId: string; coins: 0 }
  | { kind: "allFound"; coins: number }
  | { kind: "jackpot"; coins: number };

export const POSTCARDS: Record<string, string[]> = {
  Sam: [
    "Made you a tiny bowl. It's lopsided. It's yours.",
    "If you hear Mitski through the wall, that's a cry for snacks.",
    "Saw a dog in a raincoat today. Thought of the floor.",
    "Clay studio's open late Thursday — come get muddy.",
    "Left oat milk in the fridge. Labeled. For once.",
  ],
  Jordan: [
    "Library's third floor has the good chairs. Don't tell anyone.",
    "Ran past your window at 6am. You were asleep. Respect.",
    "House music fixes everything. Prescription attached.",
    "Found your sock in the dryer. It's on the lost & found crate.",
    "Warehouse show Sunday. You're on the list (there is no list).",
  ],
};

/** seed string for a day's package — the date alone decides the roll, so refreshing can't re-roll */
export const packageSeed = (dateKey: string) => `${dateKey}mail`;

/**
 * The daily package roll: 60% coins (10–20), 20% postcard (+5), 15% mail exclusive, 5% jackpot (+50).
 * Pity: after PITY_AFTER packages without an exclusive, the next is guaranteed one.
 * When every exclusive is owned, the exclusive slot pays ALL_FOUND_COINS instead.
 */
export const rollPackage = (
  dateKey: string,
  packagesSinceExclusive: number,
  ownedIds: Iterable<string>,
): PackageReward => {
  const rnd = seededRandom(seedHash(packageSeed(dateKey)));
  const owned = new Set(ownedIds);
  const missing = MAIL_ITEM_IDS.filter((id) => !owned.has(id));
  const roll = rnd() * 100;
  const pity = missing.length > 0 && packagesSinceExclusive >= PITY_AFTER;
  const pick = rnd();
  if (pity || (roll >= 80 && roll < 95)) {
    if (missing.length === 0) return { kind: "allFound", coins: ALL_FOUND_COINS };
    return { kind: "item", itemId: missing[Math.floor(pick * missing.length)]!, coins: 0 };
  }
  if (roll < 60) return { kind: "coins", coins: 10 + Math.floor(pick * 11) };
  if (roll < 80) {
    const from = pick < 0.5 ? "Sam" : "Jordan";
    const lines = POSTCARDS[from]!;
    return { kind: "postcard", from, line: lines[Math.floor(rnd() * lines.length)]!, coins: POSTCARD_COINS };
  }
  return { kind: "jackpot", coins: JACKPOT_COINS };
};

/** pity counter after opening a package with this reward */
export const nextSinceExclusive = (since: number, reward: PackageReward) =>
  reward.kind === "item" || reward.kind === "allFound" ? 0 : since + 1;
