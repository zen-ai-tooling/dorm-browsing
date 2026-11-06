export type SaveTrigger = "moveIn" | "purchase" | "day3";
const KEY = "dorm-vibes-save-nudge-triggers";
let shown: SaveTrigger[] = [];
let loaded = false;

export const nextSaveTrigger = (input: {
  userId: string | null; isAnonymous: boolean; onboarded: boolean;
  purchased: boolean; daysPlayed: number; shown: readonly SaveTrigger[];
}): SaveTrigger | null => {
  if (!input.userId || !input.isAnonymous || !input.onboarded) return null;
  const eligible: SaveTrigger[] = ["moveIn"];
  if (input.purchased) eligible.push("purchase");
  if (input.daysPlayed >= 3) eligible.push("day3");
  return eligible.find((trigger) => !input.shown.includes(trigger)) ?? null;
};

export const shownSaveTriggers = () => {
  if (!loaded) {
    loaded = true;
    try {
      const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(raw)) shown = raw.filter((t): t is SaveTrigger => ["moveIn", "purchase", "day3"].includes(t));
    } catch { /* retain session fallback */ }
  }
  return shown;
};
export const markSaveTriggerShown = (trigger: SaveTrigger) => {
  shown = Array.from(new Set([...shownSaveTriggers(), trigger]));
  try { window.localStorage.setItem(KEY, JSON.stringify(shown)); } catch { /* still once this session */ }
};