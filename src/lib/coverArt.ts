import { COVER_MOTIFS, MOODS, type CoverMotif, type MoodKey } from "@/data/dorm";

/** generated covers are a 16×16 art-pixel grid; display at integer scale with pixelated rendering */
export const COVER_SIZE = 16;

/** FNV-1a — stable across reloads and platforms */
export const hashString = (str: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** hard-quantised HSL → hex, so the hashed third color stays in the pixel palette's register */
const hslHex = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${c(f(0))}${c(f(8))}${c(f(4))}`;
};

export const motifFor = (title: string, artist: string): CoverMotif =>
  COVER_MOTIFS[hashString(`${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`) % COVER_MOTIFS.length]!;

export interface CoverPixels {
  motif: CoverMotif;
  palette: [string, string, string, string];
  /** row-major palette indices, COVER_SIZE² long */
  pixels: number[];
}

/** pure + deterministic — the same song always yields the same grid */
export const coverPixels = (
  title: string,
  artist: string,
  moodKey: MoodKey,
  forcedMotif?: CoverMotif,
): CoverPixels => {
  const key = `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
  const h = hashString(key);
  const h2 = hashString(`${key}#2`);
  const mood = MOODS[moodKey] ?? MOODS.chill_ambient;
  const motif = forcedMotif ?? COVER_MOTIFS[h % COVER_MOTIFS.length]!;
  const hued = hslHex(h2 % 360, 0.55, 0.32 + ((h2 >> 9) % 3) * 0.12);
  const pair = (h >> 4) % 2 === 0 ? [hex(mood.posterAccent), hex(mood.glow)] : [hex(mood.glow), hex(mood.posterAccent)];
  const palette: CoverPixels["palette"] = [hued, pair[0]!, pair[1]!, "#241c26"];
  const v = (h >> 8) & 0xff; // variation byte
  const N = COVER_SIZE;
  const px: number[] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let c = 0;
      switch (motif) {
        case "bands": {
          const w = 2 + (v % 3);
          c = Math.floor(y / w) % 3;
          break;
        }
        case "sun": {
          const horizon = 9 + (v % 3);
          const r = 4 + (v % 2);
          const dx = x - 7.5;
          const dy = y - (horizon - 1);
          // below the horizon: stepped reflection lines of the sun on the "water"
          if (y >= horizon) c = (y - horizon) % 2 === 1 && Math.abs(dx) < r - (y - horizon) / 2 ? 1 : 2;
          else c = dx * dx + dy * dy <= r * r ? 1 : 0;
          break;
        }
        case "checker": {
          const k = 2 + (v % 2);
          c = (Math.floor(x / k) + Math.floor(y / k)) % 2 === 0 ? 0 : 1 + ((v >> 2) % 2);
          break;
        }
        case "waves": {
          const off = [0, 1, 2, 1][Math.floor(x / 2) % 4]!;
          c = Math.floor((y + off + (v % 4)) / 3) % 3;
          break;
        }
        case "diamond": {
          const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
          c = Math.floor(d / (2 + (v % 2))) % 3;
          break;
        }
        case "dots": {
          const g = 4;
          const o = v % 2;
          c = (x + o) % g === 1 && (y + o) % g === 1 ? 1 : (x + o) % g === 2 && (y + o) % g === 2 ? 2 : 0;
          break;
        }
        case "split": {
          const vertical = v % 2 === 0;
          const a = vertical ? x : y;
          c = a < 8 ? 1 : 0;
          if (a === 8) c = 3;
          if (!vertical && x > 10 && y > 10) c = 2;
          if (vertical && y > 10 && x > 10) c = 2;
          break;
        }
        case "diagonal": {
          const w = 3 + (v % 2);
          c = Math.floor((x + y) / w) % 3;
          break;
        }
      }
      px.push(c);
    }
  return { motif, palette, pixels: px };
};

const cache = new Map<string, string>();

/** cached data URL for a song's (or polaroid's) generated pixel cover; "" outside the browser */
export const coverFor = (
  title: string,
  artist: string,
  moodKey: MoodKey,
  forcedMotif?: CoverMotif,
): string => {
  const key = `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}|${moodKey}|${forcedMotif ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return "";
  const { palette, pixels } = coverPixels(title, artist, moodKey, forcedMotif);
  const canvas = document.createElement("canvas");
  canvas.width = COVER_SIZE;
  canvas.height = COVER_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  pixels.forEach((c, i) => {
    ctx.fillStyle = palette[c]!;
    ctx.fillRect(i % COVER_SIZE, Math.floor(i / COVER_SIZE), 1, 1);
  });
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
};

/** a 16×16 pixel vinyl disc with a center label in the given color */
export const discFor = (label: string): string => {
  const key = `disc|${label}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = COVER_SIZE;
  canvas.height = COVER_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  for (let y = 0; y < COVER_SIZE; y++)
    for (let x = 0; x < COVER_SIZE; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 7.6) continue;
      let col = d > 6.6 ? "#15101a" : Math.round(d) % 2 === 0 ? "#241c26" : "#34293a";
      if (d < 3.2) col = label;
      if (d < 1) col = "#15101a";
      if (x === 4 && y === 4) col = "#8d8090"; // glint — makes the stepped spin readable
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
};
