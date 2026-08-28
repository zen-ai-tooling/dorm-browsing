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
  bulletin: { interests: string[]; event: string };
  companion: { type: "plant" | "pet"; name: string; breed: string; blurb: string };
  decor: { wallpaper: string; poster: string };
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
      { title: "Midnight City", artist: "M83" },
      { title: "Redbone", artist: "Childish Gambino" },
      { title: "Sunflower", artist: "Rex Orange County" },
      { title: "Instant Crush", artist: "Daft Punk" },
      { title: "Electric Feel", artist: "MGMT" },
    ],
    bulletin: {
      interests: ["Into ambient techno lately", "Learning to skate"],
      event: "Rooftop hang — Fri 8pm",
    },
    companion: {
      type: "plant",
      name: "Spike",
      breed: "succulent",
      blurb: "low-maintenance, high standards",
    },
    decor: { wallpaper: "default", poster: "default" },
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
      { title: "Two Slow Dancers", artist: "Mitski" },
      { title: "Cherry", artist: "Lucy Dacus" },
      { title: "Motion Sickness", artist: "Phoebe Bridgers" },
      { title: "Emily", artist: "Joanna Sternberg" },
      { title: "Jubilee", artist: "Japanese Breakfast" },
    ],
    bulletin: {
      interests: ["Reading way too much sci-fi", "Started pottery class"],
      event: "Gallery opening — Sat 6pm",
    },
    companion: {
      type: "pet",
      name: "Dumpling",
      breed: "round orange cat",
      blurb: "sits in every wet clay bowl exactly once",
    },
    decor: { wallpaper: "default", poster: "default" },
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
      { title: "One More Time", artist: "Daft Punk" },
      { title: "Move Your Body", artist: "Marshall Jefferson" },
      { title: "Losing You", artist: "Solange" },
      { title: "Silver Soul", artist: "Beach House" },
      { title: "Digital Love", artist: "Daft Punk" },
    ],
    bulletin: {
      interests: ["Deep in a house music phase", "Training for a half marathon"],
      event: "Show at the warehouse — Sun 9pm",
    },
    companion: {
      type: "plant",
      name: "Disco",
      breed: "trailing pothos",
      blurb: "grows toward the speaker, not the window",
    },
    decor: { wallpaper: "default", poster: "default" },
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
  | { kind: "corkboard" }
  | { kind: "flavor"; title: string; lines: string[]; accent?: string };
