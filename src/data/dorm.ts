export type MoodKey = "chill_ambient" | "energetic_dance" | "cozy_soft";

export interface MoodPreset {
  key: MoodKey;
  label: string;
  /** wallpaper / floor tint */
  wallpaper: number;
  wall: number;
  /** poster + prop accent */
  posterAccent: number;
  glow: number;
  /** glow pulse duration in ms (lower = faster) */
  pulseMs: number;
}

export const MOODS: Record<MoodKey, MoodPreset> = {
  chill_ambient: {
    key: "chill_ambient",
    label: "chill ambient",
    wallpaper: 0xd7ecec,
    wall: 0xa9cfcb,
    posterAccent: 0x6fbfb0,
    glow: 0x63c9b6,
    pulseMs: 2400,
  },
  energetic_dance: {
    key: "energetic_dance",
    label: "energetic dance",
    wallpaper: 0xfbe0d6,
    wall: 0xeeb9a4,
    posterAccent: 0xe98d70,
    glow: 0xf59f7f,
    pulseMs: 1100,
  },
  cozy_soft: {
    key: "cozy_soft",
    label: "cozy soft",
    wallpaper: 0xe8dff7,
    wall: 0xc7b3e4,
    posterAccent: 0xa47ed0,
    glow: 0xb98ee0,
    pulseMs: 1800,
  },
};

export interface Song {
  title: string;
  artist: string;
  /** a bit of personal voice, max 40 chars ("2am drive song") */
  note?: string;
}

export const SONG_NOTE_MAX = 40;

/** motifs for generated pixel cover art + polaroid pins (see src/lib/coverArt.ts) */
export const COVER_MOTIFS = [
  "bands",
  "sun",
  "checker",
  "waves",
  "diamond",
  "dots",
  "split",
  "diagonal",
] as const;
export type CoverMotif = (typeof COVER_MOTIFS)[number];

export const WATCH_VIBES = [
  "obsessed",
  "comfort rewatch",
  "hate-watching",
  "background noise",
  "just started",
] as const;
export type WatchVibe = (typeof WATCH_VIBES)[number];

export interface NowWatching {
  title: string;
  status?: string;
  /** 0–1 */
  progress?: number;
  vibe?: WatchVibe;
  /** max 3 */
  upNext?: string[];
}
export const UP_NEXT_MAX = 3;

export type Pin =
  | { kind: "interest"; stickerId: string; text?: string }
  | { kind: "ticket"; text: string; when?: string }
  | { kind: "polaroid"; caption: string; motif: CoverMotif }
  | { kind: "pennant"; text: string }
  | { kind: "book"; title: string; author?: string };
export type PinKind = Pin["kind"];

export interface Bulletin {
  /** max BULLETIN_MAX_PINS */
  pins: Pin[];
}
export const BULLETIN_MAX_PINS = 8;

export interface PlacedItem {
  /** key into ITEM_CATALOG */
  itemId: string;
  /** footprint top-left tile x, relative to the room's own interior top-left */
  gx: number;
  /** footprint top-left tile y, relative to the room's own interior top-left */
  gy: number;
  /** 90° steps; absent means 0 (backward compatible with saved layouts) */
  rotation?: 0 | 90 | 180 | 270;
}



export interface PersonRoom {
  id: string;
  name: string;
  accentColor: string;
  mood: MoodKey;
  isActive: boolean;
  /** 3-digit door placard number */
  roomNumber?: string;
  /** shown on a door whiteboard when the room is inactive */
  awayNote?: string;
  songs: Song[];
  bulletin: Bulletin;
  companion: { type: "plant" | "pet"; name: string; breed: string; blurb: string };
  /** what the room's owner is currently watching */
  nowWatching?: NowWatching;
  /** furniture placement — data-driven, ready for a future editor */
  layout: PlacedItem[];
  /** reserved for catalog-driven wallpaper swap */
  wallpaperId: string;
  /** reserved for catalog-driven poster swap */
  posterId: string;
  doorStickers: string[];
}

export const ROOMS: PersonRoom[] = [
  {
    id: "room-1",
    name: "Your Room",
    accentColor: "#4A9B8E",
    mood: "chill_ambient",
    isActive: true,
    roomNumber: "301",
    songs: [
      { title: "Midnight City", artist: "M83", note: "2am drive song" },
      { title: "Redbone", artist: "Childish Gambino", note: "stay woke" },
      { title: "Sunflower", artist: "Rex Orange County", note: "sunday mornings" },
      { title: "Instant Crush", artist: "Daft Punk" },
      { title: "Electric Feel", artist: "MGMT", note: "first song I ever skated to" },
    ],
    bulletin: {
      pins: [
        { kind: "interest", stickerId: "skating" },
        { kind: "interest", stickerId: "custom", text: "into ambient techno lately" },
        { kind: "ticket", text: "Rooftop hang", when: "Fri 8pm" },
        { kind: "pennant", text: "Floor 3" },
      ],
    },
    companion: {
      type: "plant",
      name: "Spike",
      breed: "succulent",
      blurb: "low-maintenance, high standards",
    },
    nowWatching: {
      title: "The Bear",
      status: "Season 2, Episode 4",
      progress: 0.4,
      vibe: "obsessed",
      upNext: ["Severance", "Shōgun"],
    },
    layout: [
      { itemId: "poster_default", gx: 4, gy: 0 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
      { itemId: "tv_basic", gx: 9, gy: 3 },
      { itemId: "desk_basic", gx: 1, gy: 7 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
      { itemId: "board_basic", gx: 9, gy: 0 },
      { itemId: "plant_basic", gx: 1, gy: 4 },
    ],
    wallpaperId: "wallpaper_default",
    posterId: "poster_default",
    doorStickers: ["music-note", "skateboard"],
  },
  {
    id: "room-2",
    name: "Sam's Room",
    accentColor: "#E07A5F",
    mood: "energetic_dance",
    isActive: true,
    roomNumber: "302",
    songs: [
      { title: "Two Slow Dancers", artist: "Mitski", note: "kitchen floor crying, the good kind" },
      { title: "Cherry", artist: "Lucy Dacus", note: "wheel-throwing soundtrack" },
      { title: "Motion Sickness", artist: "Phoebe Bridgers", note: "screamed it at the show" },
      { title: "Emily", artist: "Joanna Sternberg" },
      { title: "Jubilee", artist: "Japanese Breakfast", note: "bus window song" },
    ],
    bulletin: {
      pins: [
        { kind: "interest", stickerId: "pottery" },
        { kind: "interest", stickerId: "reading" },
        { kind: "polaroid", caption: "first bowl that didn't crack", motif: "sun" },
        { kind: "book", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin" },
        { kind: "pennant", text: "Clay Club" },
        { kind: "ticket", text: "Gallery opening", when: "Sat 6pm" },
        { kind: "interest", stickerId: "skating" },
      ],
    },
    companion: {
      type: "pet",
      name: "Dumpling",
      breed: "round orange cat",
      blurb: "sits in every wet clay bowl exactly once",
    },
    nowWatching: {
      title: "Perfect Days",
      status: "rewatching, third time",
      progress: 0.7,
      vibe: "comfort rewatch",
      upNext: ["Past Lives", "Aftersun", "Paterson"],
    },
    layout: [
      { itemId: "poster_default", gx: 4, gy: 0 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
      { itemId: "tv_basic", gx: 9, gy: 3 },
      { itemId: "desk_basic", gx: 1, gy: 7 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
      { itemId: "board_basic", gx: 9, gy: 0 },
      { itemId: "pet_cat_basic", gx: 1, gy: 4 },
    ],
    wallpaperId: "wallpaper_default",
    posterId: "poster_default",
    doorStickers: ["book", "pottery"],
  },
  {
    id: "room-3",
    name: "Jordan's Room",
    accentColor: "#9B6BC7",
    mood: "cozy_soft",
    isActive: false,
    roomNumber: "303",
    awayNote: "at the library",
    songs: [
      { title: "One More Time", artist: "Daft Punk", note: "gym walkout" },
      { title: "Move Your Body", artist: "Marshall Jefferson", note: "the house music bible" },
      { title: "Losing You", artist: "Solange" },
      { title: "Silver Soul", artist: "Beach House", note: "cooldown lap" },
      { title: "Digital Love", artist: "Daft Punk", note: "mile 9 when it hurts" },
    ],
    bulletin: {
      pins: [
        { kind: "interest", stickerId: "house_music" },
        { kind: "interest", stickerId: "running" },
        { kind: "ticket", text: "Show at the warehouse", when: "Sun 9pm" },
        { kind: "polaroid", caption: "race bib #214", motif: "diagonal" },
        { kind: "book", title: "Energy Flash", author: "Simon Reynolds" },
        { kind: "pennant", text: "Floor 3" },
        { kind: "interest", stickerId: "vinyl" },
      ],
    },
    companion: {
      type: "plant",
      name: "Disco",
      breed: "trailing pothos",
      blurb: "grows toward the speaker, not the window",
    },
    nowWatching: {
      title: "Boiler Room sets",
      status: "on in the background, always",
      progress: 1,
      vibe: "background noise",
      upNext: ["Shōgun", "Paris Is Burning"],
    },
    layout: [
      { itemId: "poster_default", gx: 4, gy: 0 },
      { itemId: "bed_basic", gx: 9, gy: 5 },
      { itemId: "tv_basic", gx: 9, gy: 3 },
      { itemId: "desk_basic", gx: 1, gy: 7 },
      { itemId: "speaker_basic", gx: 1, gy: 2 },
      { itemId: "board_basic", gx: 9, gy: 0 },
      { itemId: "plant_basic", gx: 1, gy: 4 },
    ],
    wallpaperId: "wallpaper_default",
    posterId: "poster_default",
    doorStickers: ["vinyl", "sneaker"],
  },
];

export const COMMUNITY_CORKBOARD = {
  title: "Floor 3 Corkboard",
  items: [
    "Laundry room out of order until Thursday",
    "Anyone want to split a pizza order Friday?",
    "New plant swap shelf by the vending machine",
  ],
};

export const FLAVOR_PROPS = {
  vending: {
    title: "Vending Machine",
    lines: ["Out of order (since March)", "B4 — mystery granola bar", "Takes coins it will never give back"],
  },
  lostFound: {
    title: "Lost & Found",
    lines: ["1 single sock, argyle", "A key to something", "Someone's very good umbrella"],
  },
  lounge: {
    title: "Couch & Console",
    lines: ["Controller 2 has sticky drift", "Blanket claimed by nobody, used by everybody"],
  },
  courtyard: {
    title: "String Lights",
    lines: ["Bench still warm", "Someone left a half-finished crossword"],
  },
  study: {
    title: "Bookshelf",
    lines: ["Textbooks nobody opened", "A shelf of borrowed novels"],
  },
  kitchen: {
    title: "Fridge",
    lines: ["Label your food (nobody labels their food)", "Three separate half-cartons of oat milk"],
  },
  locked: {
    title: "Room 304",
    lines: ["Locked for now", "More rooms coming soon"],
  },
};

/** Popup payload emitted from the game scene to React. */
export type PopupPayload =
  | { kind: "songs"; room: PersonRoom }
  | { kind: "bulletin"; room: PersonRoom }
  | { kind: "companion"; room: PersonRoom }
  | { kind: "watching"; room: PersonRoom }
  | { kind: "corkboard" }
  | { kind: "art"; title: string; textureKey: string; accent?: string }
  | { kind: "flavor"; title: string; lines: string[]; accent?: string };
