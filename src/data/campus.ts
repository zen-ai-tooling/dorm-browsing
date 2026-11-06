/** Campus geometry and date-seeded flavor; shared by rendering, movement and tests. */
export const CAMPUS_W = 88;
export const CAMPUS_H = 60;
export type TilePoint = { x: number; y: number };
export const LIBRARY = { x: 24, y: 39, w: 33, h: 11 };
export const CAMPUS_PROPS = [
  { id: "oak", x: 43, y: 55, w: 1, h: 1 },
  { id: "fountain", x: 33, y: 54, w: 2, h: 2 },
  { id: "truck", x: 64, y: 52, w: 4, h: 2 },
  { id: "kiosk", x: 18, y: 51, w: 1, h: 1 },
  { id: "coffee", x: 60, y: 39, w: 2, h: 1 },
  ...[[26, 53], [52, 53], [26, 57], [52, 57]].map(([x, y], i) => ({ id: `picnic-${i}`, x: x ?? 0, y: y ?? 0, w: 3, h: 1 })),
  ...[[39, 53], [47, 55], [39, 58], [17, 56]].map(([x, y], i) => ({ id: `bench-${i}`, x: x ?? 0, y: y ?? 0, w: 2, h: 1 })),
];
export const WAYPOINTS: Record<string, TilePoint> = {
  west: { x: 3, y: 36 }, east: { x: 84, y: 36 }, gate: { x: 76, y: 28 },
  walkWest: { x: 21, y: 36 }, walkEast: { x: 59, y: 36 },
  library: { x: 40, y: 50 }, steps: { x: 40, y: 51 },
  coffee: { x: 60, y: 40 }, truck: { x: 65, y: 54 }, kiosk: { x: 19, y: 51 },
  fountain: { x: 35, y: 55 }, oak: { x: 42, y: 55 },
  picnic0: { x: 27, y: 54 }, picnic1: { x: 53, y: 54 },
  picnic2: { x: 27, y: 58 }, picnic3: { x: 53, y: 58 },
  bench0: { x: 40, y: 54 }, bench1: { x: 48, y: 56 },
  bench2: { x: 40, y: 57 }, bench3: { x: 18, y: 57 },
};
export const WAYPOINT_GRAPH: Record<string, string[]> = {
  west: ["walkWest"], east: ["walkEast", "gate"], gate: ["walkEast", "east"],
  walkWest: ["west", "walkEast", "kiosk"], walkEast: ["east", "gate", "walkWest", "coffee"],
  coffee: ["walkEast", "steps", "truck"], kiosk: ["walkWest", "steps", "bench3"],
  library: ["steps"], steps: ["library", "kiosk", "coffee", "fountain", "picnic0", "picnic1"],
  fountain: ["steps", "oak", "bench0", "picnic2"], oak: ["fountain", "bench1", "bench2"],
  truck: ["coffee", "picnic1", "picnic3"], picnic0: ["steps", "picnic2"],
  picnic1: ["steps", "truck"], picnic2: ["picnic0", "fountain", "bench2"],
  picnic3: ["truck", "bench1"], bench0: ["fountain", "oak"], bench1: ["oak", "picnic3"],
  bench2: ["oak", "picnic2"], bench3: ["kiosk", "picnic2"],
};
export const isCampusGround = (x: number, y: number) => y >= 35 && y < CAMPUS_H && x >= 1 && x < CAMPUS_W - 1;
export const isCampusBlocked = (x: number, y: number) =>
  (x >= LIBRARY.x && x < LIBRARY.x + LIBRARY.w && y >= LIBRARY.y && y < LIBRARY.y + LIBRARY.h) ||
  CAMPUS_PROPS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
export const openCampusGrid = (grid: number[][]) => {
  for (let y = 35; y < CAMPUS_H; y++) for (let x = 1; x < CAMPUS_W - 1; x++) {
    const row = grid[y];
    if (row) row[x] = isCampusBlocked(x, y) ? 3 : 1;
  }
  for (let y = 28; y <= 34; y++) for (const x of [76, 77]) {
    const row = grid[y];
    if (row) row[x] = 1;
  }
};
export const isCampusPath = (x: number, y: number) =>
  (y >= 35 && y <= 37 && x >= 3 && x <= 84) ||
  (x >= 76 && x <= 77 && y >= 28 && y <= 34) ||
  (y >= 38 && ((x >= 20 && x <= 22) || (x >= 58 && x <= 60))) ||
  (y >= 50 && y <= 51 && x >= 35 && x <= 46) ||
  (y >= 51 && (Math.abs(y - (51 + (x - 18) / 7)) < 0.65 || Math.abs(y - (51 + (70 - x) / 7)) < 0.65));
export const seedFor = (key: string) => {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export const seededRandom = (key: string) => {
  let h = seedFor(key);
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
};
export type LeafPhase = "green" | "autumn" | "snow" | "blossom";
export const leafPhaseForMonth = (month: number): LeafPhase =>
  month >= 5 && month <= 8 ? "green" : month >= 9 && month <= 11 ? "autumn" : month === 12 || month <= 2 ? "snow" : "blossom";
export const libraryOpen = (hour: number) => hour >= 8 || hour < 2;
export const stringLightsOn = (hour: number) => hour >= 18 || hour < 1;
export const clockAt = (now: Date, hourOverride: number | null) => ({ hour: hourOverride ?? now.getHours(), minute: hourOverride === null ? now.getMinutes() : 0 });
export const bellStrikeCount = (hour: number) => Math.min(3, hour % 12 || 12);
export const FORTUNES = [
  "Your next group project will have one hero. It's not you.", "A missing sock will return with a better GPA.",
  "The microwave will respect you eventually.", "Your next crush also has 47 unread emails.",
  "Someone will label the oat milk. It will still vanish.", "The laundry machine is thinking about your request.",
  "An extension cord will solve a problem you didn't know you had.", "You will find your keys in the last pocket you check.",
  "Your playlist will carry the group project.", "A nap is a meeting with your future self.",
  "The dining hall mystery sauce knows your major.", "Tomorrow's you has not agreed to do this homework.",
  "The printer smells fear. Approach casually.", "Office hours will contain an actual answer.",
  "Your room plant believes in you. Quietly.", "A bench will become your favorite classroom.",
  "Someone in the library is also pretending to understand.", "The couch will accept your apology.",
  "A pigeon will judge your outfit. Ignore its credentials.", "Your next coffee will have main-character energy.",
  "You will finish the reading. The important pages, anyway.", "A late-night snack will restore your faith in humanity.",
  "The group chat will finally pick a time.", "Your headphones will untangle when you've stopped caring.",
  "You are one clean mug away from a fresh start.", "Professor has reviewed your application. Meow.",
  "A squirrel has hidden your motivation somewhere safe.", "Today's detour will be better than the shortcut.",
  "The clock tower is not judging your bedtime.", "An unexpected compliment will survive three deadlines.",
  "Your next essay title will be suspiciously good.", "A stranger will hold the door. Accept the kindness.",
  "You will be early to something by accident.", "The best notes are in someone else's margins.",
  "A free chair will appear just when you need it.", "Your leftovers are plotting a comeback.",
  "A terrible pun will improve your afternoon.", "You will remember the password on the third try.",
  "Your next study break will become a fond memory.", "The fountain recommends water and a reasonable bedtime.",
];
export const fortuneForDate = (date: string) => {
  const random = seededRandom(`${date}:fountain`);
  const text = FORTUNES[Math.floor(random() * FORTUNES.length)] ?? FORTUNES[0] ?? "Good things ahead.";
  const coins = random() < 0.3 ? 3 + Math.floor(random() * 8) : 0;
  return { text, coins };
};
export const TRUCKS = [
  { name: "Taco Tuesday-ish", color: 0xd56153, menu: ["Deadline tacos", "Extra-credit salsa", "The group-project burrito"] },
  { name: "Boba & Beyond", color: 0x8c76a0, menu: ["Emotional support boba", "Zero sleep milk tea", "Mystery major matcha"] },
  { name: "Crepe Expectations", color: 0xddb85e, menu: ["Great expectations Nutella", "Honor-roll strawberry", "Existential cheese crepe"] },
  { name: "Ramen Semester", color: 0xb75543, menu: ["Midterm miso", "Thesis tonkotsu", "Extra-credit egg"] },
  { name: "Grilled Cheese Degree", color: 0xd89c48, menu: ["Magna cum cheddar", "Dean's-list melt", "Tomato soup seminar"] },
  { name: "Falafel Fellowship", color: 0x64946b, menu: ["Study-buddy falafel", "Hummus office hours", "Pita dissertation"] },
  { name: "Dumpling Department", color: 0x65a8a1, menu: ["Intro to dumplings", "Advanced chili crisp", "Six-credit sesame noodles"] },
];
export const truckForDate = (date: string) => TRUCKS[new Date(`${date}T12:00:00`).getDay()] ?? TRUCKS[0];
export const FLYERS = [
  "Club fair: find your people, or at least a free pen.", "Open mic Friday. The mic is open; your ex is not invited.",
  "Lost cat: Professor is not lost. He's networking.", "Someone took my oat milk. We need to talk.",
  "Intramural frisbee: enthusiasm counts as experience.", "Plant swap Sunday: no cactus custody disputes.",
  "Chess club: bring a board, leave your ego.", "Film society: three hours of subtitles and snacks.",
  "Ceramics sale: slightly lopsided, deeply loved.", "DJ night: Jordan promises to stop at midnight.",
  "Free tutoring: yes, even that class.", "Poetry circle: rhyming optional, feelings inevitable.",
  "Campus radio needs voices and weird playlists.", "Knitting club: beginners and tangled yarn welcome.",
  "Bike repair pop-up: squeaks diagnosed for free.", "Volunteer garden crew: dirt is the dress code.",
  "Roommate wanted: must respect the rice cooker.", "Ultimate league: very medium athletics.",
  "Book swap: annotations included at no charge.", "Debate society: snacks are not up for debate.",
  "Midnight breakfast: pancakes beat panic.", "Study buddies wanted: quiet company counts.",
  "Bring back my blue mug. You know who you are.", "Astronomy night: weather permitting, wonder guaranteed.",
  "Language exchange: teach me how to order lunch.", "Improv workshop: saying yes is the homework.",
  "Trail walk Saturday: a hill, not a personality test.", "Board games in the lounge: friendship may vary.",
  "Free zine table: take one, make one.", "Campus cleanup: pick up three things, feel powerful.",
];
export const flyersForDate = (date: string) => {
  const random = seededRandom(`${date}:flyers`);
  const pool = [...FLYERS];
  return Array.from({ length: 3 }, () => pool.splice(Math.floor(random() * pool.length), 1)[0] ?? "Club fair today.");
};
const DRINKS = ["Brown-sugar deadline latte", "Lavender library fog", "Maple midterm cold brew", "Extra-credit espresso", "Cinnamon syllabus cappuccino", "Honey oat office-hours latte", "Mint matcha motivation", "Orange mocha existential crisis"];
export const drinkForDate = (date: string) => DRINKS[seedFor(`${date}:drink`) % DRINKS.length] ?? "Coffee";