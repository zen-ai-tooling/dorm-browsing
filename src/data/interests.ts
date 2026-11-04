/**
 * Pure helpers for the songs / watching / bulletin content model:
 * save normalization + migration (old `interests`/`event` → pins), and the
 * client-side "you have this in common" comparison.
 */
import {
  BULLETIN_MAX_PINS,
  COVER_MOTIFS,
  SONG_NOTE_MAX,
  UP_NEXT_MAX,
  WATCH_VIBES,
  type Bulletin,
  type CoverMotif,
  type NowWatching,
  type Pin,
  type Song,
  type WatchVibe,
} from "./dorm";
import { CUSTOM_STICKER_ID, STICKER_BY_ID } from "./stickers";

type Raw = Partial<
  Record<
    | "kind" | "title" | "artist" | "note" | "status" | "progress" | "vibe" | "upNext"
    | "stickerId" | "text" | "when" | "caption" | "motif" | "author" | "pins" | "interests" | "event",
    unknown
  >
>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

export const normalizeSongs = (raw: unknown, fallback: Song[]): Song[] => {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw.map((s) => {
    const o = (s ?? {}) as Raw;
    const note = str(o.note).slice(0, SONG_NOTE_MAX);
    return { title: str(o.title), artist: str(o.artist), ...(note ? { note } : {}) };
  });
};

export const normalizeWatching = (raw: unknown, fallback: NowWatching): NowWatching => {
  const o = (raw ?? {}) as Raw;
  if (!o.title) return fallback;
  const w: NowWatching = { title: str(o.title), status: str(o.status) };
  if (typeof o.progress === "number" && Number.isFinite(o.progress))
    w.progress = Math.max(0, Math.min(1, o.progress));
  if ((WATCH_VIBES as readonly string[]).includes(str(o.vibe))) w.vibe = o.vibe as WatchVibe;
  if (Array.isArray(o.upNext))
    w.upNext = o.upNext.map(str).filter((t) => t.trim()).slice(0, UP_NEXT_MAX);
  return w;
};

const normalizePin = (raw: unknown): Pin | null => {
  const o = (raw ?? {}) as Raw;
  switch (o.kind) {
    case "interest": {
      const id = str(o.stickerId);
      const text = str(o.text);
      // unknown preset ids keep their content as a custom sticker
      if (!STICKER_BY_ID[id]) return text || id ? { kind: "interest", stickerId: CUSTOM_STICKER_ID, text: text || id } : null;
      return text ? { kind: "interest", stickerId: id, text } : { kind: "interest", stickerId: id };
    }
    case "ticket":
      return o.text ? { kind: "ticket", text: str(o.text), ...(o.when ? { when: str(o.when) } : {}) } : null;
    case "polaroid": {
      const motif = (COVER_MOTIFS as readonly string[]).includes(str(o.motif))
        ? (o.motif as CoverMotif)
        : "sun";
      return { kind: "polaroid", caption: str(o.caption), motif };
    }
    case "pennant":
      return o.text ? { kind: "pennant", text: str(o.text) } : null;
    case "book":
      return o.title ? { kind: "book", title: str(o.title), ...(o.author ? { author: str(o.author) } : {}) } : null;
    default:
      return null;
  }
};

/** accepts the new `{ pins }` shape or the legacy `{ interests, event }` shape; never drops content */
export const normalizeBulletin = (raw: unknown, fallback: Bulletin): Bulletin => {
  const o = (raw ?? null) as Raw | null;
  if (!o) return fallback;
  if (Array.isArray(o.pins)) {
    return { pins: o.pins.map(normalizePin).filter((p): p is Pin => !!p) };
  }
  if (Array.isArray(o.interests) || typeof o.event === "string") {
    const pins: Pin[] = [];
    if (Array.isArray(o.interests))
      for (const i of o.interests) {
        const text = str(i).trim();
        if (text) pins.push({ kind: "interest", stickerId: CUSTOM_STICKER_ID, text });
      }
    const event = str(o.event).trim();
    if (event) pins.push({ kind: "ticket", text: event });
    // migrated boards may exceed the cap — keep everything; the editor just blocks adding more
    return { pins };
  }
  return fallback;
};

export const canAddPin = (b: Bulletin) => b.pins.length < BULLETIN_MAX_PINS;

/* ---------------- "you have this in common" ---------------- */

export const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

export const sharedArtists = (mine: Song[]) => new Set(mine.map((s) => norm(s.artist)).filter(Boolean));

export const sharedShows = (mine: NowWatching) =>
  new Set([mine.title, ...(mine.upNext ?? [])].map(norm).filter(Boolean));

/** a stable key per pin for matching: preset sticker id, custom text, or pennant text */
export const pinMatchKey = (p: Pin): string | null => {
  if (p.kind === "interest")
    return p.stickerId === CUSTOM_STICKER_ID ? (norm(p.text) ? `custom:${norm(p.text)}` : null) : `sticker:${p.stickerId}`;
  if (p.kind === "pennant") return norm(p.text) ? `pennant:${norm(p.text)}` : null;
  return null;
};

export const sharedPinKeys = (mine: Bulletin) =>
  new Set(mine.pins.map(pinMatchKey).filter((k): k is string => !!k));

export const songMatches = (theirs: Song[], mine: Song[]) => {
  const set = sharedArtists(mine);
  return theirs.map((s) => !!norm(s.artist) && set.has(norm(s.artist)));
};

export const pinMatches = (theirs: Bulletin, mine: Bulletin) => {
  const set = sharedPinKeys(mine);
  return theirs.pins.map((p) => {
    const k = pinMatchKey(p);
    return !!k && set.has(k);
  });
};

export const showMatches = (theirs: NowWatching, mine: NowWatching) => {
  const set = sharedShows(mine);
  return {
    title: !!norm(theirs.title) && set.has(norm(theirs.title)),
    upNext: (theirs.upNext ?? []).map((t) => !!norm(t) && set.has(norm(t))),
  };
};

/** distinct things in common — two Daft Punk songs count once */
export const countSongCommon = (theirs: Song[], mine: Song[]) => {
  const set = sharedArtists(mine);
  return new Set(theirs.map((s) => norm(s.artist)).filter((a) => a && set.has(a))).size;
};
