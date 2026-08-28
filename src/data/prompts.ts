export interface DailyPrompt {
  id: string;
  question: string;
  options: string[];
}

export const DAILY_COIN_REWARD = 10;

export const DAILY_PROMPTS: DailyPrompt[] = [
  {
    id: "friday",
    question: "What's your ideal Friday night?",
    options: ["Loud show downtown", "Movie in the lounge", "Long walk, no plan"],
  },
  {
    id: "study",
    question: "Where do you actually get work done?",
    options: ["Study lounge", "My desk", "Kitchen table at 2am"],
  },
  {
    id: "snack",
    question: "Best late-night dorm snack?",
    options: ["Instant noodles", "Cereal, dry", "Whatever's in the fridge"],
  },
  {
    id: "music",
    question: "What's on repeat this week?",
    options: ["Something ambient", "Loud dance", "Sad acoustic", "Old vinyl"],
  },
  {
    id: "weekend",
    question: "Pick a floor hang for this weekend",
    options: ["Rooftop", "Courtyard string lights", "Game night"],
  },
  {
    id: "mood",
    question: "Today's mood in one word",
    options: ["Cozy", "Wired", "Floating"],
  },
];

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** deterministic day-of-year pick, wrapping the array */
export const promptForToday = (d = new Date()): DailyPrompt => {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86_400_000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length]!;
};
