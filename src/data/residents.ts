import { DEFAULT_LOOK, type AvatarLook } from "./avatar";

/* ---------------------------------------------------------------
 * Sam and Jordan: looks, real-time schedules and what they say.
 * Pure data + pure functions (no Phaser, no React) so the scene,
 * the popups and the tests all read the same rules.
 * ------------------------------------------------------------- */

export type ResidentId = "sam" | "jordan";
export const RESIDENT_IDS: ResidentId[] = ["sam", "jordan"];

export type Facing = "down" | "up" | "left" | "right";
export type Emote = "coffee" | "book" | "headphones" | "pencil" | "tv" | "game" | "music" | "zz" | "shake";
export type Place = "room" | "bed" | "kitchen" | "study" | "lounge" | "courtyard" | "away";

export interface Block {
  /** local hours, [from, to) — never wraps; 22–1 is split into 22–24 and 0–1 */
  from: number;
  to: number;
  place: Place;
  /** short line for the popup ("making pour-over before class") */
  activity: string;
  emote: Emote;
  /** shown on the nameplate when away */
  awayNote?: string;
}

export interface Anchor {
  /** tile coordinates in the world grid */
  x: number;
  y: number;
  facing: Facing;
}

export interface ResidentDef {
  id: ResidentId;
  name: string;
  /** PersonRoom id in ROOMS */
  roomId: string;
  look: AvatarLook;
  anchors: Record<Exclude<Place, "away">, Anchor>;
  schedule: Block[];
}

/** courtyard edge where residents leave the building and come back */
export const EXIT_TILE = { x: 76, y: 27 };
/** hall tile just outside each resident's doorway (knock spot) */
export const KNOCK_TILES: Record<ResidentId, Array<[number, number]>> = {
  sam: [
    [32, 18],
    [33, 18],
  ],
  jordan: [
    [53, 18],
    [54, 18],
  ],
};
/** Your Room's doorway, where the evening visitor stands */
export const MY_DOOR_TILE = { x: 12, y: 18 };

export const RESIDENTS: Record<ResidentId, ResidentDef> = {
  sam: {
    id: "sam",
    name: "Sam",
    roomId: "room-2",
    look: {
      ...DEFAULT_LOOK,
      skin: 2,
      hairStyle: "curly",
      hairColor: 3,
      top: { style: "stripe", color: 2 },
      bottom: { style: "jeans", color: 1 },
      accessory: "earrings",
    },
    anchors: {
      room: { x: 30, y: 13, facing: "left" },
      bed: { x: 37, y: 14, facing: "down" },
      kitchen: { x: 51, y: 25, facing: "up" },
      study: { x: 29, y: 26, facing: "up" },
      lounge: { x: 9, y: 28, facing: "up" },
      courtyard: { x: 80, y: 14, facing: "up" },
    },
    schedule: [
      { from: 0, to: 1, place: "room", activity: "reading way past bedtime", emote: "book" },
      { from: 1, to: 6, place: "bed", activity: "asleep", emote: "zz" },
      { from: 6, to: 8, place: "bed", activity: "asleep", emote: "zz" },
      { from: 8, to: 10, place: "kitchen", activity: "making pour-over before class", emote: "coffee" },
      { from: 10, to: 13, place: "study", activity: "annotating a novel in pencil", emote: "book" },
      { from: 13, to: 17, place: "away", activity: "at the clay studio", emote: "pencil", awayNote: "at the clay studio" },
      { from: 17, to: 19, place: "courtyard", activity: "sketching on the courtyard bench", emote: "pencil" },
      { from: 19, to: 22, place: "lounge", activity: "watching TV on the lounge couch", emote: "tv" },
      { from: 22, to: 24, place: "room", activity: "reading in the papasan", emote: "book" },
    ],
  },
  jordan: {
    id: "jordan",
    name: "Jordan",
    roomId: "room-3",
    look: {
      ...DEFAULT_LOOK,
      skin: 4,
      hairStyle: "buzz",
      hairColor: 0,
      top: { style: "hoodie", color: 7 },
      bottom: { style: "joggers", color: 1 },
      accessory: "headphones",
    },
    anchors: {
      room: { x: 52, y: 9, facing: "up" },
      bed: { x: 58, y: 14, facing: "down" },
      kitchen: { x: 49, y: 26, facing: "up" },
      study: { x: 32, y: 26, facing: "up" },
      lounge: { x: 17, y: 26, facing: "up" },
      courtyard: { x: 78, y: 20, facing: "left" },
    },
    schedule: [
      { from: 0, to: 1, place: "room", activity: "one more mix on the decks", emote: "music" },
      { from: 1, to: 6, place: "bed", activity: "asleep", emote: "zz" },
      { from: 6, to: 8, place: "away", activity: "out on a run", emote: "shake", awayNote: "out on a run" },
      { from: 8, to: 10, place: "kitchen", activity: "blending a protein shake", emote: "shake" },
      { from: 10, to: 13, place: "study", activity: "studying with headphones on", emote: "headphones" },
      { from: 13, to: 17, place: "away", activity: "at the library", emote: "book", awayNote: "at the library" },
      { from: 17, to: 19, place: "room", activity: "practicing on the decks", emote: "music" },
      { from: 19, to: 22, place: "lounge", activity: "on the arcade cabinet", emote: "game" },
      { from: 22, to: 24, place: "lounge", activity: "spinning records in the lounge", emote: "music" },
    ],
  },
};

export const residentByRoom = (roomId: string): ResidentDef | undefined =>
  Object.values(RESIDENTS).find((r) => r.roomId === roomId);

const norm = (h: number) => ((Math.floor(h) % 24) + 24) % 24;

/** the schedule block for a local hour (0–23) */
export const blockAt = (id: ResidentId, hour: number): Block => {
  const h = norm(hour);
  const b = RESIDENTS[id].schedule.find((s) => h >= s.from && h < s.to);
  return b ?? RESIDENTS[id].schedule[0]!;
};

/** stable key for "which block are they in" (block changes trigger a walk) */
export const blockKey = (b: Block) => `${b.from}-${b.place}`;

export const isAway = (b: Block) => b.place === "away";
export const isAsleep = (b: Block) => b.place === "bed";
/** in their own room and awake: the door glows and music notes drift */
export const isHome = (b: Block) => b.place === "room";

/** next hour (0–23) when they're back on the floor, counting forward from `hour` */
export const nextBackHour = (id: ResidentId, hour: number): number => {
  const now = blockAt(id, hour);
  for (let step = 1; step <= 24; step++) {
    const h = norm(hour + step);
    const b = blockAt(id, h);
    if (b !== now && !isAway(b) && b.from === h) return h;
  }
  return norm(hour);
};

export const formatHour = (h: number) => {
  const x = norm(h);
  if (x === 0) return "midnight";
  if (x === 12) return "noon";
  return x < 12 ? `${x}am` : `${x - 12}pm`;
};

const PLACE_NAME: Record<Place, string> = {
  room: "their room",
  bed: "bed",
  kitchen: "the Kitchenette",
  study: "the Study Lounge",
  lounge: "the Common Lounge",
  courtyard: "the courtyard",
  away: "out",
};

export type KnockKind = "in" | "asleep" | "away" | "out";
/** what you get for knocking on their door at this hour */
export const knockResponse = (id: ResidentId, hour: number): { kind: KnockKind; text: string } => {
  const b = blockAt(id, hour);
  const name = RESIDENTS[id].name;
  if (isHome(b)) return { kind: "in", text: "Come in!" };
  if (isAsleep(b)) return { kind: "asleep", text: "zzz… (try later)" };
  if (isAway(b))
    return { kind: "away", text: `${name}'s ${b.awayNote ?? "out"} — back around ${formatHour(nextBackHour(id, hour))}` };
  return { kind: "out", text: `No answer. (${name}'s probably in ${PLACE_NAME[b.place]}.)` };
};

/* ---------------- dialogue ---------------- */

export interface TalkContext {
  hour: number;
  /** your answer to today's question, if any */
  dailyAnswer: string | null;
  /** their answer to today's question */
  theirDaily: string | null;
  /** first artist you both have in your Top 5 */
  commonArtist: string | null;
  /** first interest sticker label you both pinned */
  commonInterest: string | null;
  /** your newest purchase or placed item (display name) */
  newestItem: string | null;
  /** worn outfit (display name) */
  outfit: string | null;
}

export interface Line {
  id: string;
  text: string;
}

type Voice = {
  daily: (answer: string, same: boolean) => string;
  common: (what: string, kind: "artist" | "interest") => string;
  item: (name: string) => string;
  outfit: (name: string) => string;
  /** activity / time-of-day lines, tagged by schedule place */
  activity: Array<[Place, string]>;
  filler: string[];
};

const VOICES: Record<ResidentId, Voice> = {
  sam: {
    daily: (a, same) => (same ? `${a}? Same. Don't tell anyone we agree on things.` : `${a}, huh. I'd have guessed that about you.`),
    common: (w, k) =>
      k === "artist" ? `Wait, you like ${w} too? Okay. You can borrow my headphones.` : `You're into ${w.toLowerCase()} too? That's rare on this floor.`,
    item: (n) => `Is that a ${n.toLowerCase()} I saw in your room? Tasteful. Annoyingly.`,
    outfit: (n) => `${n}, huh. It works on you. I'm as surprised as you are.`,
    activity: [
      ["kitchen", "Pour-over takes four minutes. It's the only four minutes I'm patient."],
      ["kitchen", "There's oat milk in the fridge. It's labeled. It's mine. You can have some."],
      ["study", "I'm annotating this so hard the margins are crying."],
      ["study", "Study lounge is quiet until Jordan's headphones leak. Then it's a rave."],
      ["courtyard", "I'm sketching the tree. The tree is not cooperating."],
      ["courtyard", "Golden hour makes everyone look like they're in a movie. Even you."],
      ["lounge", "We're watching something slow. You'll hate it. Sit down."],
      ["lounge", "This couch has eaten three of my pencils. It's a tax."],
      ["room", "Reading the same chapter for the third time. It's good every time."],
      ["room", "Dumpling is on my book. I live here now, I guess."],
    ],
    filler: [
      "I threw a bowl today. It's lopsided. It's perfect.",
      "Clay under my nails is my whole personality right now.",
      "I skated to class and only fell once. Growth.",
      "Mitski for the walk there, Japanese Breakfast for the walk back.",
      "If you ever need a mug, I have eleven. Some hold liquid.",
      "The plant swap shelf is where good plants go to be adopted.",
      "I keep a list of people who label their food. You're on the list.",
      "Rainy days are for wheel-throwing and saying nothing.",
      "I'm trying to read 30 books this year. I'm on book 4. It's November.",
      "Don't tell Jordan, but the 6am runner wave is kind of cute.",
    ],
  },
  jordan: {
    daily: (a, same) => (same ? `${a}!! We're synced. That's a sign.` : `${a}?! Respect. Big respect.`),
    common: (w, k) =>
      k === "artist" ? `WAIT. You like ${w}?? Okay, you're coming to the next warehouse show.` : `${w}?! Finally someone on this floor gets it.`,
    item: (n) => `Yo, is that a ${n.toLowerCase()} in your room? That's a power move.`,
    outfit: (n) => `${n}?! Okay, fit check passed. Ten out of ten.`,
    activity: [
      ["kitchen", "Protein shake number one. There will be a number two."],
      ["kitchen", "Banana, oats, peanut butter. It's basically a meal and a lifestyle."],
      ["study", "Headphones on, lo-fi house, zero distractions. Mostly zero."],
      ["study", "Library's full so the study lounge gets me. Sorry in advance."],
      ["room", "Working on a transition that's either genius or a crime."],
      ["room", "I've played this one track forty times. It's almost ready."],
      ["lounge", "I'm one level from the high score. Don't breathe."],
      ["lounge", "Controller 2 drifts left. That's why I always pick controller 1."],
      ["lounge", "Late-night records in the lounge hit different. Pull up a beanbag."],
    ],
    filler: [
      "Ran 8 miles this morning. Ask me how I feel. Amazing.",
      "House music fixes everything. I'm not taking questions.",
      "Mile 9 is where you meet yourself. Mile 10 is where you leave.",
      "I made a playlist for the laundry room. It slaps. The dryer agrees.",
      "Boiler Room is on in my room 24/7. It's a vibe and a nightlight.",
      "Warehouse show Sunday. You're on the list. There is no list. Come anyway.",
      "Disco the plant grows toward the speaker. Science.",
      "Stretch before you do anything. Including talking to me.",
      "If you hear bass through the wall, that's me practicing. Sorry. Not sorry.",
      "Hydrate. I'm serious. I will check.",
    ],
  },
};

/** activity lines for a resident's current block, plus their filler pool (exposed for tests) */
export const linePools = (id: ResidentId, hour: number) => {
  const v = VOICES[id];
  const place = blockAt(id, hour).place;
  return {
    activity: v.activity.map(([p, text], i) => ({ id: `act-${i}`, place: p, text })).filter((l) => l.place === place),
    filler: v.filler.map((text, i) => ({ id: `fill-${i}`, text })),
  };
};

/**
 * One line, by priority: about you (daily answer, something in common, newest item, outfit),
 * then their activity, then personality filler — never a line already said today.
 */
export const pickLine = (id: ResidentId, ctx: TalkContext, seenToday: readonly string[]): Line => {
  const v = VOICES[id];
  const seen = new Set(seenToday);
  const aboutYou: Line[] = [];
  if (ctx.dailyAnswer) aboutYou.push({ id: "you-daily", text: v.daily(ctx.dailyAnswer, ctx.dailyAnswer === ctx.theirDaily) });
  if (ctx.commonArtist) aboutYou.push({ id: "you-common", text: v.common(ctx.commonArtist, "artist") });
  else if (ctx.commonInterest) aboutYou.push({ id: "you-common", text: v.common(ctx.commonInterest, "interest") });
  if (ctx.newestItem) aboutYou.push({ id: "you-item", text: v.item(ctx.newestItem) });
  if (ctx.outfit) aboutYou.push({ id: "you-outfit", text: v.outfit(ctx.outfit) });
  const { activity, filler } = linePools(id, ctx.hour);
  const order: Line[] = [...aboutYou, ...activity, ...filler];
  return order.find((l) => !seen.has(l.id)) ?? order[0] ?? { id: "fill-0", text: v.filler[0]! };
};

/* ---------------- the evening door visit ---------------- */

export const VISIT_FROM = 18;
export const VISIT_TO = 22;

export interface RoomInfo {
  plants: number;
  lights: number;
  newestItem: string | null;
  wallpaper: string | null;
  mood: string;
}

/** one line about what's actually in Your Room */
export const roomRemark = (id: ResidentId, info: RoomInfo): string => {
  const sam = id === "sam";
  if (info.newestItem)
    return sam
      ? `Saw the ${info.newestItem.toLowerCase()} through your door. It suits the room.`
      : `Is that a NEW ${info.newestItem.toLowerCase()}?! Your room's leveling up.`;
  if (info.plants >= 2)
    return sam ? `${info.plants} plants. You're basically a greenhouse. I approve.` : `${info.plants} plants in here? It's a jungle. A good jungle.`;
  if (info.lights > 0)
    return sam ? "Your room glows at night. It's the coziest door on the floor." : "Your lights are on — your room's got main-character lighting.";
  if (info.wallpaper)
    return sam ? `The ${info.wallpaper.toLowerCase()} wallpaper was the right call.` : `${info.wallpaper} wallpaper?! Bold. Love it.`;
  return sam ? `Very ${info.mood} in here. It feels like you.` : `Your room's giving ${info.mood}. Big fan.`;
};

/** who visits today (alternating days); the other one stands in if they're unavailable */
export const visitorOrder = (dayIndex: number): ResidentId[] => (dayIndex % 2 === 0 ? ["sam", "jordan"] : ["jordan", "sam"]);

/* ---------------- friendship ---------------- */

export const MAX_HEARTS = 10;
export const GIFT_AT = [3, 6, 10] as const;
/** gift-only items each resident mails at 3, 6 and 10 hearts */
export const GIFTS: Record<ResidentId, [string, string, string]> = {
  sam: ["gift_clay_bowl", "plant_cactus", "pottery_wheel"],
  jordan: ["poster_pennant", "gift_mixtape", "dj_decks"],
};
/** a gift you somehow already own pays this instead, so it's never empty */
export const GIFT_DUPLICATE_COINS = 25;

/** gifts unlocked by going from `before` to `after` hearts */
export const giftsUnlocked = (id: ResidentId, before: number, after: number): string[] =>
  GIFT_AT.flatMap((at, i) => (before < at && after >= at ? [GIFTS[id][i]!] : []));
