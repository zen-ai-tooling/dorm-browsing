export interface DailyPrompt {
  id: string;
  question: string;
  options: string[];
}

export const DAILY_COIN_REWARD = 15;

/** how many days of answers the save keeps */
export const DAILY_ANSWER_DAYS = 30;

export const DAILY_PROMPTS: DailyPrompt[] = [
  { id: "friday", question: "What's your ideal Friday night?", options: ["Loud show downtown", "Movie in the lounge", "Long walk, no plan"] },
  { id: "study", question: "Where do you actually get work done?", options: ["Study lounge", "My desk", "Kitchen table at 2am"] },
  { id: "snack", question: "Best late-night dorm snack?", options: ["Instant noodles", "Cereal, dry", "Whatever's in the fridge"] },
  { id: "music", question: "What's on repeat this week?", options: ["Something ambient", "Loud dance", "Sad acoustic", "Old vinyl"] },
  { id: "weekend", question: "Pick a floor hang for this weekend", options: ["Rooftop", "Courtyard string lights", "Game night"] },
  { id: "mood", question: "Today's mood in one word", options: ["Cozy", "Wired", "Floating"] },
  { id: "roommate_habit", question: "Worst roommate habit?", options: ["Alarm snoozing x9", "Dishes 'soaking'", "Speakerphone calls", "Borrowing without asking"] },
  { id: "study_soundtrack", question: "Pick a study soundtrack.", options: ["Lo-fi beats", "Film scores", "Total silence", "Same album on loop"] },
  { id: "food_run", question: "Best 2am food run?", options: ["Pizza by the slice", "Gas station hot dog", "Diner pancakes", "Vending machine roulette"] },
  { id: "room_theme", question: "Dream dorm room theme?", options: ["Plant jungle", "Arcade basement", "Cozy cabin", "Space station"] },
  { id: "floor_event", question: "Which floor event would you actually go to?", options: ["Karaoke night", "Bake-off", "Movie marathon", "Silent disco"] },
  { id: "laundry", question: "How long does your laundry sit in the dryer?", options: ["I'm there at the beep", "An hour, tops", "Until someone texts me", "It lives there now"] },
  { id: "alarm", question: "How many alarms do you set?", options: ["Just one", "Three, spaced out", "Seven, every 2 minutes", "I wake up naturally (liar)"] },
  { id: "rainy_day", question: "Perfect rainy day plan?", options: ["Blanket + a show", "Café window seat", "Walk in it anyway", "Nap, obviously"] },
  { id: "hall_noise", question: "What hallway noise do you hear most?", options: ["Someone's guitar", "Microwave beeping", "Door slams", "Distant laughing"] },
  { id: "coffee", question: "Your coffee order says…", options: ["Black, no notes", "Oat latte", "Iced, even in winter", "I'm a tea person"] },
  { id: "group_project", question: "Your group project role?", options: ["Does everything", "Makes the slides", "Comic relief", "Vanishes until the deadline"] },
  { id: "superpower", question: "Pick a useful dorm superpower", options: ["Always find laundry", "Instant noodles, perfect", "Nap anywhere", "Never lose your keys"] },
  { id: "decor", question: "First thing you put up on your wall?", options: ["Band poster", "Fairy lights", "Photos from home", "Nothing yet"] },
  { id: "playlist", question: "Name your shower playlist vibe", options: ["Power ballads", "Musical theater", "Rap verses", "Humming only"] },
  { id: "breakfast", question: "Dining hall breakfast pick?", options: ["Waffle station", "Cereal tower", "Eggs, any style", "Skip it, sleep in"] },
  { id: "procrastinate", question: "Favorite way to procrastinate?", options: ["Rearrange my room", "Deep wiki dive", "'Quick' nap", "Snack expedition"] },
  { id: "pet", question: "If the dorm allowed one pet, which?", options: ["A lazy cat", "Hallway dog", "A single goldfish", "Communal tortoise"] },
  { id: "movie_genre", question: "Lounge movie night genre?", options: ["Horror", "Rom-com", "Animated", "So-bad-it's-good"] },
  { id: "sunday", question: "Sunday reset routine?", options: ["Clean everything", "Meal prep", "Call home", "Pretend it's Saturday"] },
  { id: "elevator", question: "Elevator small talk topic?", options: ["The weather", "Exam season", "Compliment shoes", "Stare at the numbers"] },
  { id: "quiet_hours", question: "Quiet hours: honest take?", options: ["Sacred", "Suggestions", "What quiet hours?", "Only during finals"] },
  { id: "dessert", question: "Best dorm dessert you can make?", options: ["Mug cake", "Cookie dough, raw", "Fancy toast", "Ice cream + cereal"] },
  { id: "comfort_show", question: "Your comfort rewatch?", options: ["An office sitcom", "Baking competition", "Old cartoons", "Nature documentaries"] },
  { id: "game_night", question: "Pick the game night game", options: ["Mario Kart", "Uno (friendships end)", "Charades", "Trivia"] },
  { id: "packing", question: "What did you overpack?", options: ["Shoes", "Books I won't read", "Kitchen stuff", "Hoodies, so many"] },
  { id: "texting", question: "Your texting style?", options: ["Paragraphs", "One word", "Voice notes", "Memes only"] },
  { id: "campus_spot", question: "Favorite spot on campus?", options: ["Library top floor", "The big lawn", "Hidden bench", "Café by the gym"] },
  { id: "bedtime", question: "Realistic bedtime?", options: ["10pm, I'm proud", "Midnight-ish", "2am again", "Sunrise club"] },
  { id: "shared_fridge", question: "Shared fridge crime you've seen?", options: ["Milk stolen", "Ancient leftovers", "Mystery container", "Label war"] },
  { id: "season", question: "Best season on campus?", options: ["Fall leaves", "First snow", "Spring lawns", "Summer, empty halls"] },
  { id: "karaoke", question: "Your karaoke go-to?", options: ["A big ballad", "Throwback pop", "Rap I barely know", "I just hype others"] },
  { id: "plant_care", question: "How's your plant doing?", options: ["Thriving", "Surviving", "Plastic, technically", "Please don't ask"] },
  { id: "late_class", question: "8am class strategy?", options: ["Coffee IV drip", "Pajamas under coat", "Sit at the back", "Never sign up for one"] },
  { id: "weekend_trip", question: "Dream weekend trip?", options: ["Beach town", "Big city", "Cabin in the woods", "Home for laundry"] },
  { id: "dorm_smell", question: "What should the dorm smell like?", options: ["Fresh laundry", "Popcorn", "Rain", "Pine candles"] },
  { id: "headphones", question: "Headphones on means…", options: ["Do not disturb", "Just vibing", "Not even playing anything", "Hi, still talk to me"] },
  { id: "hot_take", question: "Strongest dorm opinion?", options: ["Top bunk is best", "Rugs are mandatory", "Lofted beds rule", "Desk lamps > overheads"] },
  { id: "midterm", question: "Midterm week survival kit?", options: ["Energy drinks", "Highlighters", "Snack drawer", "Panic and optimism"] },
  { id: "hobby", question: "New hobby you'd pick up?", options: ["Pottery", "Skateboarding", "Crochet", "DJing"] },
  { id: "vending", question: "Vending machine pick?", options: ["Chips", "Candy bar", "Weird soda", "The one that's always stuck"] },
  { id: "first_week", question: "Best first-week move?", options: ["Prop your door open", "Join three clubs", "Learn everyone's name", "Find the good bathroom"] },
  { id: "lost_item", question: "What do you lose most?", options: ["Keys", "Student ID", "One sock", "Track of time"] },
  { id: "window_view", question: "Ideal window view?", options: ["Trees", "City lights", "The quad", "Brick wall (honest)"] },
  { id: "playlist_name", question: "Name for the floor playlist?", options: ["Floor 3 Forever", "Quiet Hours (Not)", "Hall Bangers", "Laundry Day"] },
  { id: "study_snack", question: "Study snack of choice?", options: ["Gummy worms", "Popcorn", "Apple slices", "Coffee counts"] },
  { id: "shoes", question: "Shoes in the dorm?", options: ["Slippers only", "Socks, always", "Sneakers, ready to go", "Barefoot chaos"] },
  { id: "notes", question: "How do you take notes?", options: ["Laptop", "Paper, color-coded", "Photos of the board", "Memory (bold)"] },
  { id: "birthday", question: "Floor birthday tradition?", options: ["Surprise cake", "Hallway serenade", "Door decorating", "Group dinner out"] },
  { id: "chore", question: "Least-hated chore?", options: ["Vacuuming", "Dishes", "Trash run", "Making the bed"] },
  { id: "cereal", question: "Cereal for dinner: acceptable?", options: ["Always", "Only on Sundays", "With a banana, it's balanced", "Never"] },
  { id: "photo", question: "What's in your camera roll?", options: ["Sunsets", "Screenshots", "Food", "Blurry concerts"] },
  { id: "rooftop", question: "Rooftop hang soundtrack?", options: ["Indie folk", "Old R&B", "Synthwave", "Nobody's phone, just talking"] },
  { id: "dream_job", question: "Dream campus job?", options: ["Library desk", "Radio DJ", "Barista", "Campus tour guide"] },
  { id: "finals_end", question: "First thing after finals?", options: ["Sleep 14 hours", "Big celebration meal", "Clean my room", "Start a new show"] },
];

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** deterministic day-of-year pick, wrapping the array */
export const promptForToday = (d = new Date()): DailyPrompt => {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86_400_000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length]!;
};

export const promptById = (id: string) => DAILY_PROMPTS.find((p) => p.id === id);

/* ---------------- seeded helpers (stable across reloads) ---------------- */

/** FNV-1a 32-bit string hash */
export const seedHash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 — small deterministic PRNG returning [0, 1) */
export const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** the neighbours whose daily answers show up on the corkboard and their doors */
export const DAILY_RESIDENTS = [
  { id: "room-2", name: "Sam" },
  { id: "room-3", name: "Jordan" },
] as const;

/** a resident's pick for a prompt: hashed from residentId + promptId so it never changes */
export const residentPick = (residentId: string, prompt: DailyPrompt) =>
  prompt.options[seedHash(residentId + prompt.id) % prompt.options.length]!;

/** "Floor 3 residents" split: one whole percentage per option, seeded by prompt id, summing to 100 */
export const floorSplit = (prompt: DailyPrompt): number[] => {
  const rnd = seededRandom(seedHash(prompt.id + "split"));
  const weights = prompt.options.map(() => 1 + rnd() * 9);
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / total) * 100);
  const out = raw.map(Math.floor);
  // largest remainder so the bars always add up to exactly 100
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]! += 1;
    left--;
  }
  return out;
};

export interface DailyAnswer {
  promptId: string;
  answer: string;
}

/** keeps only the most recent DAILY_ANSWER_DAYS entries (date keys sort chronologically) */
export const trimDailyAnswers = (answers: Record<string, DailyAnswer>): Record<string, DailyAnswer> => {
  const keys = Object.keys(answers).sort().slice(-DAILY_ANSWER_DAYS);
  return Object.fromEntries(keys.map((k) => [k, answers[k]!]));
};

export const normalizeDailyAnswers = (raw: unknown): Record<string, DailyAnswer> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, DailyAnswer> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const a = v as Partial<DailyAnswer> | null;
    if (a && typeof a.promptId === "string" && typeof a.answer === "string")
      out[k] = { promptId: a.promptId, answer: a.answer };
  }
  return trimDailyAnswers(out);
};

/** door-whiteboard handwriting: ~18 characters, then an ellipsis */
export const boardText = (s: string, max = 18) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
