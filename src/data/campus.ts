/** Campus geometry and date-seeded flavor; shared by rendering, movement and tests. */
export const CAMPUS_W = 88;
export const CAMPUS_H = 66;
export type TilePoint = { x: number; y: number };
export const LIBRARY = { x: 24, y: 39, w: 33, h: 11 };
/** the dorm's front entrance: hallway door at row 22, stone path down to the Walk */
export const FRONT_PATH = { x0: 24, x1: 25, y0: 23, y1: 34 };
export const CAMPUS_PROPS = [
  { id: "oak", x: 52, y: 61, w: 1, h: 1 },
  { id: "fountain", x: 33, y: 55, w: 2, h: 2 },
  { id: "truck", x: 64, y: 52, w: 4, h: 2 },
  { id: "kiosk", x: 18, y: 51, w: 1, h: 1 },
  { id: "coffee", x: 60, y: 39, w: 2, h: 1 },
  { id: "mapsign", x: 26, y: 34, w: 1, h: 1 },
  { id: "trash", x: 57, y: 40, w: 1, h: 1 },
  ...[[22, 33], [19, 42]].map(([x, y], i) => ({ id: `bikes-${i}`, x: x ?? 0, y: y ?? 0, w: 2, h: 1 })),
  ...[[26, 55], [52, 55], [26, 60], [55, 60]].map(([x, y], i) => ({ id: `picnic-${i}`, x: x ?? 0, y: y ?? 0, w: 3, h: 1 })),
  ...[[31, 58], [47, 62], [55, 62], [17, 57]].map(([x, y], i) => ({ id: `bench-${i}`, x: x ?? 0, y: y ?? 0, w: 2, h: 1 })),
  // Library Walk benches: south edge, between the lamp posts
  ...[[12, 38], [30, 38], [44, 38], [68, 38]].map(([x, y], i) => ({ id: `bench-w${i}`, x: x ?? 0, y: y ?? 0, w: 2, h: 1 })),
];
export const WAYPOINTS: Record<string, TilePoint> = {
  west: { x: 3, y: 36 }, east: { x: 84, y: 36 }, gate: { x: 76, y: 28 },
  walkWest: { x: 21, y: 36 }, walkEast: { x: 59, y: 36 },
  frontDoor: { x: 24, y: 34 },
  library: { x: 40, y: 50 }, steps: { x: 40, y: 51 },
  coffee: { x: 60, y: 40 }, truck: { x: 65, y: 54 }, kiosk: { x: 19, y: 51 },
  fountain: { x: 35, y: 57 }, oak: { x: 51, y: 62 },
  picnic0: { x: 27, y: 56 }, picnic1: { x: 53, y: 56 },
  picnic2: { x: 27, y: 61 }, picnic3: { x: 53, y: 61 },
  bench0: { x: 32, y: 59 }, bench1: { x: 48, y: 63 },
  bench2: { x: 54, y: 63 }, bench3: { x: 18, y: 58 },
};
export const WAYPOINT_GRAPH: Record<string, string[]> = {
  west: ["walkWest"], east: ["walkEast", "gate"], gate: ["walkEast", "east"],
  walkWest: ["west", "walkEast", "kiosk", "frontDoor"], walkEast: ["east", "gate", "walkWest", "coffee"],
  frontDoor: ["walkWest"],
  coffee: ["walkEast", "steps", "truck"], kiosk: ["walkWest", "steps", "bench3"],
  library: ["steps"], steps: ["library", "kiosk", "coffee", "fountain", "picnic0", "picnic1"],
  fountain: ["steps", "bench0", "picnic2", "bench2"], oak: ["bench1", "bench2", "picnic3"],
  truck: ["coffee", "picnic1", "picnic3"], picnic0: ["steps", "picnic2"],
  picnic1: ["steps", "truck", "bench2"], picnic2: ["picnic0", "fountain", "bench0"],
  picnic3: ["truck", "bench1", "oak"], bench0: ["fountain", "picnic2"], bench1: ["oak", "picnic3"],
  bench2: ["oak", "fountain", "picnic1"], bench3: ["kiosk", "picnic2"],
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
  // front entrance: stone path from the hallway's south door down to the Walk
  for (let y = FRONT_PATH.y0; y <= FRONT_PATH.y1; y++) for (let x = FRONT_PATH.x0; x <= FRONT_PATH.x1; x++) {
    const row = grid[y];
    if (row) row[x] = 1;
  }
};
export const isCampusPath = (x: number, y: number) =>
  (y >= 35 && y <= 37 && x >= 3 && x <= 84) ||
  (x >= 76 && x <= 77 && y >= 28 && y <= 34) ||
  (x >= FRONT_PATH.x0 && x <= FRONT_PATH.x1 && y >= FRONT_PATH.y0 && y <= FRONT_PATH.y1) ||
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
/** Library doors/steps axis that must stay clear of props and canopy all the way down the Quad. */
export const LIBRARY_AXIS = { x0: 38, x1: 43, y0: 50, y1: CAMPUS_H - 1 };
/** Outdoor tiles walk faster than rooms. */
export const isOutdoorTile = (x: number, y: number) =>
  y >= 35 || (y >= 28 && x >= 76 && x <= 77) ||
  (x >= FRONT_PATH.x0 && x <= FRONT_PATH.x1 && y >= FRONT_PATH.y0 && y <= FRONT_PATH.y1);
export const OUTDOOR_SPEED = 1.4;
export const JOG_SPEED = 1.8;
/** Quick-travel destinations for the Me menu and the campus map (tile targets). */
export const QUICK_TRAVEL = {
  quad: { x: 41, y: 57 },
  library: { x: 40, y: 51 },
  truck: { x: 65, y: 54 },
  study: { x: 35, y: 28 },
  kitchen: { x: 54, y: 28 },
  backyard: { x: 76, y: 21 },
} as const;

/* ---------------- the Backyard (courtyard zone x69–84, y7–27) ---------------- */

export const BACKYARD = { x: 69, y: 7, w: 16, h: 21 };
/** stone path: from the dorm door (x68, rows 18–19) across to the gate spur (x75–76 down to row 27) */
export const isBackyardPath = (x: number, y: number) =>
  (y === 19 && x >= 69 && x <= 76) || (x >= 75 && x <= 76 && y >= 19 && y <= 27);
export const FIRE_PIT = { x: 76, y: 14 };
export const GARDEN_BEDS = [[70, 9], [74, 9], [78, 9]] as const;
export const HAMMOCK = { x: 73, y: 12 };
export const GARDEN_STAGES = ["sprout", "leafy", "flowering", "ready"] as const;
/** one stage per real day, staggered per bed */
export const gardenStage = (bed: number, date: string) => {
  const epoch = Math.floor(new Date(`${date}T12:00:00`).getTime() / 86400000);
  return GARDEN_STAGES[(((epoch + bed) % 4) + 4) % 4] ?? "sprout";
};
export const firePitLit = (hour: number) => hour >= 18 || hour < 1;
export const bbqOn = (weekday: number, hour: number) => weekday === 6 && hour >= 12 && hour < 18;
export const volleyballOn = (weekday: number, hour: number) => weekday === 0 && hour >= 13 && hour < 17;

/** daily chalk drawing on the backyard path: light pixel strokes in a 2×2-tile box (64×64 px) */
export const CHALK_DRAWINGS: Array<{ id: string; text?: string; lines: Array<[number, number, number, number]> }> = [
  { id: "hopscotch", lines: [[28, 4, 36, 4], [28, 4, 28, 60], [36, 4, 36, 60], [28, 18, 36, 18], [20, 32, 44, 32], [20, 32, 20, 46], [44, 32, 44, 46], [20, 46, 44, 46], [28, 60, 36, 60]] },
  { id: "heart", lines: [[24, 20, 32, 12], [32, 12, 40, 20], [24, 20, 20, 28], [40, 20, 44, 28], [20, 28, 32, 48], [44, 28, 32, 48]] },
  { id: "floor-rules", text: "FLOOR 3 RULES", lines: [[8, 44, 56, 44]] },
  { id: "professor", lines: [[22, 18, 26, 10], [26, 10, 30, 18], [34, 18, 38, 10], [38, 10, 42, 18], [22, 18, 22, 34], [42, 18, 42, 34], [22, 34, 42, 34], [26, 24, 28, 24], [36, 24, 38, 24], [32, 28, 32, 32], [32, 34, 28, 38], [32, 34, 36, 38]] },
  { id: "sun", lines: [[32, 16, 32, 16], [24, 20, 40, 20], [20, 24, 20, 36], [44, 24, 44, 36], [24, 40, 40, 40], [24, 20, 20, 24], [40, 20, 44, 24], [24, 40, 20, 36], [40, 40, 44, 36], [32, 6, 32, 12], [32, 48, 32, 54], [12, 30, 18, 30], [46, 30, 52, 30], [18, 12, 22, 16], [46, 12, 42, 16], [18, 48, 22, 44], [46, 48, 42, 44]] },
  { id: "rocket", lines: [[32, 8, 26, 22], [32, 8, 38, 22], [26, 22, 26, 38], [38, 22, 38, 38], [26, 38, 20, 48], [38, 38, 44, 48], [26, 38, 38, 38], [29, 44, 32, 54], [35, 44, 32, 54], [29, 26, 35, 26], [29, 30, 35, 30], [29, 26, 29, 30], [35, 26, 35, 30]] },
  { id: "tic-tac-toe", lines: [[26, 12, 26, 52], [38, 12, 38, 52], [14, 26, 50, 26], [14, 40, 50, 40], [16, 14, 24, 22], [24, 14, 16, 22], [30, 28, 34, 28], [30, 36, 34, 36], [30, 28, 30, 36], [34, 28, 34, 36], [42, 42, 48, 50], [48, 42, 42, 50]] },
  { id: "finals", text: "finals: survive", lines: [[8, 44, 56, 44], [8, 48, 40, 48]] },
];
export const chalkForDate = (date: string) =>
  CHALK_DRAWINGS[seedFor(`${date}:chalk`) % CHALK_DRAWINGS.length] ?? CHALK_DRAWINGS[0]!;

/* ---------------- little free library ---------------- */

export interface Book { title: string; author: string; blurb: string }
export const BOOKS: Book[] = [
  { title: "The Left Sock of Darkness", author: "Ursula K. Laundry", blurb: "A sock crosses the galaxy to find its pair." },
  { title: "Mile 9", author: "Jordan's Playlist", blurb: "A runner meets herself at mile 9. Mile 10 is a sequel." },
  { title: "The Oat Milk Conspiracy", author: "Fridge Collective", blurb: "Someone labeled it. Someone lied." },
  { title: "Annotations of a Margin", author: "Sam Pencilton", blurb: "The margins were crying. Now they speak." },
  { title: "A Brief History of Deadlines", author: "Prof. Last Minute", blurb: "Submitted at 11:59. Art." },
  { title: "The Printer Smells Fear", author: "I. T. Department", blurb: "Approach casually. Bring toner." },
  { title: "Dumpling Department", author: "Six Credit", blurb: "Intro to dumplings. Advanced chili crisp." },
  { title: "The Group Project", author: "One Hero", blurb: "It's not you. It was never you." },
  { title: "Quiet Tables, Warm Windows", author: "Messing Library", blurb: "One very determined printer." },
  { title: "The Couch Accepts Your Apology", author: "Common Lounge", blurb: "It has eaten three pencils. A tax." },
  { title: "Professor Is Not Lost", author: "Campus Cat", blurb: "He's networking. Meow." },
  { title: "The Fountain's Financial Advice", author: "A. Wish", blurb: "Water and a reasonable bedtime." },
  { title: "Pigeon Credentials", author: "Judge B. Bird", blurb: "Your outfit has been reviewed." },
  { title: "The Rice Cooker Accord", author: "Roommate Wanted", blurb: "Respect the rice cooker. Article one." },
  { title: "Lo-Fi Beats to Survive Finals To", author: "Study Lounge", blurb: "Headphones leak. The rave is silent." },
  { title: "The Sketchbook Tree", author: "Golden Hour", blurb: "The tree is not cooperating." },
  { title: "Forty-Seven Unread Emails", author: "Your Next Crush", blurb: "A love story. A cautionary tale." },
  { title: "The Extension Cord", author: "Unknown Problem", blurb: "It solves a problem you didn't know you had." },
  { title: "Midnight Breakfast", author: "Pancake Society", blurb: "Pancakes beat panic. Every time." },
  { title: "The Last Pocket You Check", author: "Your Keys", blurb: "A memoir of hiding." },
  { title: "Clay Under My Nails", author: "Eleven Mugs", blurb: "Some hold liquid. All hold meaning." },
  { title: "The Walk Back", author: "Japanese Breakfast", blurb: "Mitski for the walk there." },
  { title: "Warehouse Show Sunday", author: "The List", blurb: "There is no list. Come anyway." },
  { title: "Disco Grows Toward the Speaker", author: "Plant Science", blurb: "Science. Probably." },
  { title: "The Laundry Machine's Verdict", author: "Request Pending", blurb: "It is thinking about your request." },
  { title: "Emotional Support Hoodie", author: "Academic Press", blurb: "Dressed for the library, emotionally at the beach." },
  { title: "The Kiosk Knows", author: "Thirty Flyers", blurb: "Club fair: find your people, or a free pen." },
  { title: "Chalk at Dawn", author: "The Backyard", blurb: "Hopscotch is a philosophy." },
  { title: "The Hammock Semester", author: "Z. Z. Garden", blurb: "Field research, horizontal." },
  { title: "String Light Theory", author: "Saturday 8pm", blurb: "Every bulb a small warm star." },
];
export const bookForDate = (date: string) => BOOKS[seedFor(`${date}:book`) % BOOKS.length] ?? BOOKS[0]!;
