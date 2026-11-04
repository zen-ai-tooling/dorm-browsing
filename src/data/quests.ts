import type { PlacedItem } from "./dorm";
import { ITEM_CATALOG } from "./items";

export type QuestId = "daily" | "mail" | "sam" | "room" | "buy";

export interface Quest {
  id: QuestId;
  title: string;
  /** coins granted on completion */
  coins: number;
  /** item granted on completion (instead of coins) */
  itemId?: string;
}

/** "Welcome to Floor 3": first-session checklist, in display order */
export const QUESTS: Quest[] = [
  { id: "daily", title: "Answer the question of the day", coins: 10 },
  { id: "mail", title: "Open your mail cubby", coins: 15 },
  { id: "sam", title: "Find something in common with Sam", coins: 10 },
  { id: "room", title: "Make your room yours", coins: 15 },
  { id: "buy", title: "Buy something at Floor 3 Supply", coins: 0, itemId: "poster_quote" },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<QuestId, Quest>;

export interface QuestEvidence {
  lastDailyAnswerDate: string | null;
  lastPackageDate: string | null;
  ownedItemIds: string[];
  roomLayout: PlacedItem[];
  defaultLayout: PlacedItem[];
}

const layoutKey = (l: PlacedItem[]) =>
  l
    .map((p) => `${p.itemId}@${p.gx},${p.gy},${p.rotation ?? 0}`)
    .sort()
    .join("|");

/** quests an existing save has already earned (Sam's can't be inferred from a save) */
export const satisfiedQuests = (e: QuestEvidence): QuestId[] => {
  const out: QuestId[] = [];
  if (e.lastDailyAnswerDate) out.push("daily");
  if (e.lastPackageDate) out.push("mail");
  if (layoutKey(e.roomLayout) !== layoutKey(e.defaultLayout)) out.push("room");
  const bought = e.ownedItemIds.some((id) => {
    const item = ITEM_CATALOG[id];
    return !!item && !item.unlockedByDefault && !item.exclusive;
  });
  if (bought) out.push("buy");
  return out;
};

/** marks already-satisfied quests done — no rewards are granted for these */
export const autoCompleteQuests = (done: string[], e: QuestEvidence): string[] =>
  Array.from(new Set([...done, ...satisfiedQuests(e)]));
