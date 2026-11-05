import {
  CLOTH_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  type AvatarLook,
} from "@/data/avatar";

/* ---------------------------------------------------------------
 * Player sprite: 16×21 art pixels, 1px ink outline, 3-tone shading.
 * Pure (no Phaser): drawn into a pixel buffer, then flushed to any
 * painter — a Phaser Graphics for world textures, a canvas for UI.
 * ------------------------------------------------------------- */

export const CHAR_W = 16;
export const CHAR_H = 21;
export type Dir = "down" | "up" | "left" | "right";
export const DIRS: Dir[] = ["down", "left", "up", "right"];

const INK = 0x241c26;
const SHOE = 0x2e3140;
const GOLD = 0xf0c75e;
const CREAM = 0xf0e4cd;

type Buf = Array<Array<number | undefined>>;

/** minimal painter: Phaser Graphics and the canvas adapter both fit */
export interface Painter {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
}

const newBuf = (): Buf => Array.from({ length: CHAR_H }, () => Array<number | undefined>(CHAR_W).fill(undefined));

/** one character frame as a pixel buffer (+ the flat contact shadow drawn under it) */
export const charPixels = (look: AvatarLook, dir: Dir, step: number): Buf => {
  const buf = newBuf();
  // right is drawn as left, then mirrored — keeps both sides identical
  const d: Dir = dir === "right" ? "left" : dir;
  const bob = step === 1 ? -1 : 0;
  const sw = step === 1 ? 1 : step === 2 ? -1 : 0;
  const cx = 8;

  const [skin, skinSh] = SKIN_TONES[look.skin] ?? SKIN_TONES[1]!;
  const [hair, hairHi] = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1]!;
  const [top, topSh, topHi] = CLOTH_COLORS[look.top.color] ?? CLOTH_COLORS[0]!;
  const [bot, botSh, botHi] = CLOTH_COLORS[look.bottom.color] ?? CLOTH_COLORS[1]!;

  const set = (x: number, y: number, c: number) => {
    if (x < 0 || y < 0 || x >= CHAR_W || y >= CHAR_H) return;
    buf[y]![x] = c;
  };
  const fill = (x: number, y: number, w: number, h: number, c: number, mask?: Set<number>) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        set(xx, yy, c);
        if (mask && xx >= 0 && yy >= 0 && xx < CHAR_W && yy < CHAR_H) mask.add(yy * CHAR_W + xx);
      }
  };
  /** ink on every mask pixel that touches the outside (outline drawn on the edge, like line()) */
  const outline = (mask: Set<number>) => {
    for (const k of mask) {
      const x = k % CHAR_W;
      const y = Math.floor(k / CHAR_W);
      const edge =
        x === 0 ||
        y === 0 ||
        x === CHAR_W - 1 ||
        y === CHAR_H - 1 ||
        !mask.has(k - 1) ||
        !mask.has(k + 1) ||
        !mask.has(k - CHAR_W) ||
        !mask.has(k + CHAR_W);
      if (edge) buf[y]![x] = INK;
    }
  };

  /* ---------- legs / bottoms ---------- */
  const gown = look.top.style === "gown";
  const lx = cx - 3 + sw;
  const rx = cx + 1 - sw;
  const ly = 15 + bob;
  const legs = (rows: number, from: number, c: number) => {
    fill(lx, from, 2, rows, c);
    fill(rx, from, 2, rows, c);
  };
  const b = look.bottom.style;
  if (b === "shorts" || b === "skirt") {
    legs(4, ly, skin);
    legs(1, ly + 3, skinSh);
    if (b === "shorts") {
      legs(2, ly, bot);
      legs(1, ly + 1, botSh);
    }
  } else {
    legs(4, ly, bot);
    legs(1, ly + 2, botSh);
    if (b === "joggers") legs(1, ly + 3, botHi); // ribbed cuff
  }
  fill(cx - 4 + sw, 19 + bob, 3, 1, SHOE);
  fill(cx + 1 - sw, 19 + bob, 3, 1, SHOE);
  if (b === "skirt" && !gown) {
    const m = new Set<number>();
    fill(cx - 4, ly, 8, 1, bot, m);
    fill(cx - 5, ly + 1, 10, 2, bot, m);
    fill(cx - 4, ly + 2, 8, 1, botSh);
    outline(m);
  }

  /* ---------- torso ---------- */
  const ty = 10 + bob;
  const st = look.top.style;
  const torso = new Set<number>();
  if (st === "gown") {
    fill(cx - 4, ty, 8, 5, top, torso);
    fill(cx - 5, ty + 5, 10, 4, top, torso);
    fill(cx - 5, ty + 7, 10, 2, topSh);
    fill(cx - 3, ty, 6, 1, topHi);
  } else {
    fill(cx - 4, ty, 8, 6, top, torso);
    fill(cx - 4, ty + 4, 8, 2, topSh);
    fill(cx - 3, ty, 6, 1, topHi);
  }
  // per-style detail (front view unless noted)
  const front = d === "down";
  const side = d === "left";
  if (st === "stripe") {
    fill(cx - 4, ty + 1, 8, 1, CREAM);
    fill(cx - 4, ty + 3, 8, 1, CREAM);
  } else if (st === "hoodie") {
    if (front) {
      fill(cx - 2, ty + 1, 1, 2, CREAM);
      fill(cx + 1, ty + 1, 1, 2, CREAM);
      fill(cx - 2, ty + 3, 4, 2, topSh);
      fill(cx - 2, ty + 3, 4, 1, topHi);
    } else if (side) {
      fill(cx + 1, ty, 3, 2, topSh); // hood at the back
      fill(cx - 3, ty + 3, 3, 2, topSh);
    } else {
      fill(cx - 3, ty + 1, 6, 2, topSh);
      fill(cx - 2, ty + 1, 4, 1, topHi);
    }
  } else if (st === "jacket") {
    if (front) {
      fill(cx - 1, ty, 2, 6, CREAM);
      fill(cx - 2, ty, 1, 2, topHi);
      fill(cx + 1, ty, 1, 2, topHi);
    } else if (side) fill(cx - 4, ty, 1, 6, CREAM);
    else fill(cx - 1, ty + 1, 1, 5, topSh);
  } else if (st === "varsity") {
    fill(cx - 4, ty + 5, 8, 1, CREAM);
    if (front) {
      fill(cx - 1, ty, 2, 6, topSh);
      set(cx - 1, ty + 1, CREAM);
      set(cx - 1, ty + 3, CREAM);
      fill(cx + 1, ty + 1, 2, 2, CREAM); // chest letter
    }
  } else if (st === "overalls") {
    // tee underneath, denim bib + straps on top
    fill(cx - 4, ty, 8, 2, CREAM);
    fill(cx - 4, ty + 2, 8, 4, bot);
    fill(cx - 4, ty + 5, 8, 1, botSh);
    fill(cx - 3, ty, 1, 2, bot);
    fill(cx + 2, ty, 1, 2, bot);
    if (front) {
      fill(cx - 2, ty + 2, 4, 2, botHi);
      set(cx - 3, ty + 2, GOLD);
      set(cx + 2, ty + 2, GOLD);
    }
  } else if (st === "bandtee") {
    if (front) {
      fill(cx - 2, ty + 1, 4, 2, topHi);
      set(cx - 1, ty + 1, GOLD);
      set(cx, ty + 2, GOLD);
    }
  } else if (st === "gown") {
    if (front) {
      fill(cx - 1, ty, 2, 2, CREAM);
      fill(cx, ty + 2, 1, 6, topSh);
    }
  }
  outline(torso);

  // arms: sleeve color + hands; short sleeves on tees
  const shortSleeve = st === "tee" || st === "stripe" || st === "bandtee" || st === "overalls";
  const sleeve = st === "varsity" || st === "overalls" ? CREAM : topSh;
  const armY = (rise: boolean) => ty + 1 + (rise ? -1 : 0);
  for (const [ax, rise] of [
    [cx - 5, step === 1],
    [cx + 4, step === 2],
  ] as const) {
    const y0 = armY(rise);
    if (shortSleeve) {
      fill(ax, y0, 1, 2, sleeve);
      fill(ax, y0 + 2, 1, 2, skin);
    } else {
      fill(ax, y0, 1, 3, sleeve);
      fill(ax, y0 + 3, 1, 1, skin);
    }
  }

  /* ---------- head + hair ---------- */
  const hy = 2 + bob;
  const X0 = cx - 5;
  const X1 = cx + 4;
  const head = new Set<number>();
  fill(X0, hy, 10, 9, skin, head);
  fill(X0, hy + 7, 10, 2, skinSh);
  const hs = look.hairStyle;
  const H = (x: number, y: number, w: number, h: number) => fill(x, y, w, h, hair, head);
  const hi = (x: number, y: number, w: number) => fill(x, y, w, 1, hairHi);
  const curlTex = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((xx + yy * 2) % 3 === 0) set(xx, yy, hairHi);
  };
  const bunTop = Math.max(0, hy - 2);

  if (d === "up") {
    if (hs === "short") H(X0, hy, 10, 6);
    else if (hs === "buzz") {
      H(X0, hy, 10, 5);
      curlTex(X0 + 1, hy + 1, 8, 3);
    } else if (hs === "bob") {
      H(X0, hy, 10, 9);
      H(X0 - 1, hy + 2, 1, 7);
      H(X1 + 1, hy + 2, 1, 7);
    } else if (hs === "long") {
      H(X0, hy, 10, 9);
      H(X0 - 1, hy + 2, 12, 11);
    } else if (hs === "curly") {
      H(X0 - 1, hy - 1, 12, 8);
      H(X0, hy - 2, 2, 1);
      H(X0 + 4, hy - 2, 2, 1);
      H(X1 - 1, hy - 2, 2, 1);
      curlTex(X0, hy, 10, 6);
    } else {
      H(X0, hy, 10, 6);
      H(cx - 2, bunTop, 4, hy - bunTop);
    }
    if (hs !== "curly" && hs !== "buzz") hi(X0 + 1, hy + 1, 8);
  } else if (d === "down") {
    if (hs === "short") {
      H(X0, hy, 10, 3);
      H(X0, hy + 3, 1, 4);
      H(X1, hy + 3, 1, 4);
    } else if (hs === "buzz") {
      H(X0, hy, 10, 2);
      curlTex(X0 + 1, hy, 8, 2);
    } else if (hs === "bob" || hs === "long") {
      H(X0, hy, 10, 3);
      const len = hs === "bob" ? 8 : 12;
      H(X0 - 1, hy + 1, 2, len);
      H(X1, hy + 1, 2, len);
    } else if (hs === "curly") {
      H(X0 - 1, hy - 1, 12, 4);
      H(X0, hy - 2, 2, 1);
      H(X0 + 4, hy - 2, 2, 1);
      H(X1 - 1, hy - 2, 2, 1);
      H(X0 - 1, hy + 3, 2, 3);
      H(X1, hy + 3, 2, 3);
      curlTex(X0, hy - 1, 10, 3);
    } else {
      H(X0, hy, 10, 3);
      H(cx - 2, bunTop, 4, hy - bunTop);
    }
    if (hs !== "curly" && hs !== "buzz") hi(X0 + 1, hy + 1, 5);
  } else {
    // facing left: face on the left, the back of the head on the right
    if (hs === "short") {
      H(X0, hy, 10, 3);
      H(X0, hy + 3, 1, 4);
      H(X1 - 1, hy + 3, 2, 3);
    } else if (hs === "buzz") {
      H(X0, hy, 10, 2);
      H(cx + 2, hy + 2, 3, 2);
      curlTex(X0 + 1, hy, 8, 2);
    } else if (hs === "bob" || hs === "long") {
      H(X0, hy, 10, 3);
      H(X0, hy + 3, 1, 2);
      const len = hs === "bob" ? 6 : 10;
      H(cx + 2, hy + 3, 4, len);
    } else if (hs === "curly") {
      H(X0 - 1, hy - 1, 12, 4);
      H(X0 + 1, hy - 2, 2, 1);
      H(X0 + 5, hy - 2, 2, 1);
      H(cx + 2, hy + 3, 4, 4);
      curlTex(X0, hy - 1, 11, 7);
    } else {
      H(X0, hy, 10, 3);
      H(cx + 2, hy + 3, 3, 2);
      H(cx + 1, bunTop, 4, hy - bunTop + 1);
    }
    if (hs !== "curly" && hs !== "buzz") hi(X0 + 1, hy + 1, 5);
  }
  outline(head);

  // face
  if (d !== "up") {
    const off = d === "left" ? -1 : 0;
    const ey = hy + 5;
    fill(cx - 3 + off, ey, 1, 2, INK);
    fill(cx + 2 + off, ey, 1, 2, INK);
    fill(cx - 4 + off, ey + 3, 2, 1, 0xd08a7c);
    fill(cx + 2 + off, ey + 3, 2, 1, 0xd08a7c);
    fill(cx - 1 + off, ey + 3, 2, 1, 0x9a6558);
  }

  /* ---------- accessories ---------- */
  const acc = look.accessory;
  if (acc === "glasses" && d !== "up") {
    const off = d === "left" ? -1 : 0;
    const ey = hy + 5;
    fill(cx - 4 + off, ey - 1, 8, 1, INK);
    for (const x of [cx - 4, cx - 2, cx + 1, cx + 3]) set(x + off, ey, INK);
    set(cx - 3 + off, ey - 1, 0xb3d6ef);
    set(cx + 2 + off, ey - 1, 0xb3d6ef);
  } else if (acc === "earrings" && d !== "up") {
    if (d === "down") {
      fill(X0 - 1, hy + 6, 1, 2, GOLD);
      fill(X1 + 1, hy + 6, 1, 2, GOLD);
    } else fill(cx + 1, hy + 7, 1, 2, GOLD);
  } else if (acc === "headphones") {
    const m = new Set<number>();
    const band = 0x3d3a44;
    fill(X0 + 1, Math.max(0, hy - 1), 8, 1, band, m);
    if (d === "left") {
      fill(cx + 1, hy, 1, 4, band, m);
      fill(cx, hy + 3, 3, 4, band, m);
      outline(m);
      set(cx + 1, hy + 4, 0x8ab6bd);
    } else {
      fill(X0 - 1, hy, 1, 4, band, m);
      fill(X1 + 1, hy, 1, 4, band, m);
      fill(X0 - 2, hy + 3, 3, 4, band, m);
      fill(X1, hy + 3, 3, 4, band, m);
      outline(m);
      set(X0 - 1, hy + 4, 0x8ab6bd);
      set(X1 + 1, hy + 4, 0x8ab6bd);
    }
  } else if (acc === "beanie") {
    const m = new Set<number>();
    const [c, sh, h] = CLOTH_COLORS[2]!;
    fill(X0, bunTop, 10, hy + 3 - bunTop, c, m);
    fill(X0, hy + 2, 10, 1, sh);
    for (let x = X0 + 1; x < X1; x += 2) set(x, hy + 2, h);
    outline(m);
    set(cx - 2, bunTop + 1, h);
  } else if (acc === "buckethat") {
    const m = new Set<number>();
    const [c, sh, h] = CLOTH_COLORS[3]!;
    fill(X0 + 1, bunTop, 8, hy + 2 - bunTop, c, m);
    fill(X0 - 1, hy + 2, 12, 2, sh, m);
    outline(m);
    fill(X0 + 2, bunTop + 1, 6, 1, h);
  } else if (acc === "gradcap") {
    const m = new Set<number>();
    const cap = 0x2a2830;
    fill(X0 + 1, hy, 8, 3, cap, m);
    fill(X0 - 1, bunTop, 12, 2, 0x3d3a44, m);
    outline(m);
    if (d !== "left") fill(X1 + 1, bunTop + 1, 1, 4, GOLD);
    else fill(X0, bunTop + 1, 1, 4, GOLD);
  }

  if (dir === "right") for (const row of buf) row.reverse();
  return buf;
};

/** flat 2-row contact shadow, then the sprite — `scale` = painter px per art px */
export const paintChar = (p: Painter, look: AvatarLook, dir: Dir, step: number, scale = 2) => {
  const s = scale;
  p.fillStyle(0x2b2431, 0.3);
  p.fillRect(4 * s, 19 * s, 8 * s, s);
  p.fillStyle(0x2b2431, 0.22);
  p.fillRect(5 * s, 20 * s, 6 * s, s);
  const buf = charPixels(look, dir, step);
  for (let y = 0; y < CHAR_H; y++) {
    const row = buf[y]!;
    let x = 0;
    while (x < CHAR_W) {
      const c = row[x];
      if (c === undefined) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < CHAR_W && row[x + w] === c) w++;
      p.fillStyle(c, 1);
      p.fillRect(x * s, y * s, w * s, s);
      x += w;
    }
  }
};
