import * as Phaser from "phaser";

type G = Phaser.GameObjects.Graphics;

/* ---------------------------------------------------------------
 * PIXEL-ART RULES (16-bit interior tileset)
 *  - one art pixel = P canvas px; nothing is ever drawn off that grid
 *  - hard edges only: no rounded rects, no blur, no gradients
 *  - 3-tone flat shading: base / shadow / highlight bands
 *  - 1px ink outline around every silhouette
 *  - depth faked with dithering, never with soft alpha ramps
 * ------------------------------------------------------------- */

/** canvas px per art pixel */
export const P = 2;

const INK = 0x241c26;

const make = (scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) => {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w * P, h * P);
  g.destroy();
};

/** single flat pixel-aligned rect */
const r = (g: G, x: number, y: number, w: number, h: number, c: number, a = 1) => {
  g.fillStyle(c, a);
  g.fillRect(Math.round(x) * P, Math.round(y) * P, Math.round(w) * P, Math.round(h) * P);
};

/** 1px ink outline (hard, pixel-perfect) */
const line = (g: G, x: number, y: number, w: number, h: number, c = INK) => {
  r(g, x, y, w, 1, c);
  r(g, x, y + h - 1, w, 1, c);
  r(g, x, y, 1, h, c);
  r(g, x + w - 1, y, 1, h, c);
};

/** checkerboard dither used for shade transitions and texture */
const dither = (g: G, x: number, y: number, w: number, h: number, c: number, phase = 0) => {
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) if ((xx + yy + phase) % 2 === 0) r(g, x + xx, y + yy, 1, 1, c);
};

/** base panel: fill + top highlight band + bottom shadow band + ink outline */
const panel = (
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  shade: number,
  hi: number,
) => {
  r(g, x, y, w, h, base);
  r(g, x + 1, y + 1, w - 2, 1, hi);
  r(g, x + 1, y + h - 3, w - 2, 2, shade);
  dither(g, x + 1, y + h - 4, w - 2, 1, shade);
  line(g, x, y, w, h);
};

/** tight hard-edged contact shadow (flat, no blur) */
const foot = (g: G, cx: number, y: number, w: number) => {
  r(g, cx - w / 2, y, w, 1, 0x2b2431, 0.3);
  r(g, cx - w / 2 + 1, y + 1, w - 2, 1, 0x2b2431, 0.22);
};

/* ---------------- grounded warm-neutral palette ---------------- */
const SKIN = 0xdfa982;
const SKIN_SH = 0xba8362;
const HAIR = 0x4a3745;
const HAIR_HI = 0x66495a;
const SHIRT = 0x6c9aa2;
const SHIRT_SH = 0x4c757d;
const PANTS = 0x4a5468;
const PANTS_SH = 0x373f51;
const SHOE = 0x2e3140;

const WOOD = 0xa97f57;
const WOOD_SH = 0x8b6543;
const WOOD_HI = 0xc39a6d;
const LINEN = 0xe8dcc6;
const LINEN_SH = 0xc9bba1;
const METAL = 0x8d8a94;
const METAL_SH = 0x6c6975;
const METAL_HI = 0xb2aeb8;
const LEAF = 0x6f9a5f;
const LEAF_SH = 0x53773f;
const LEAF_HI = 0x8fb877;
const CORAL = 0xc8765c;
const TEAL = 0x5f8f92;
const PLUM = 0x8b6b9c;
const CREAM = 0xf0e4cd;

/**
 * True pixel sprite: 16x21 art pixels (32x42 canvas px at P=2).
 * Blocky readable silhouette, 1px ink outline, 2-3 tone shading, ~9 colours.
 */
const drawChar = (g: G, dir: string, step: number) => {
  const bob = step === 1 ? -1 : 0;
  const sw = step === 1 ? 1 : step === 2 ? -1 : 0;
  const cx = 8;

  foot(g, cx, 19, 8);

  // legs
  r(g, cx - 3 + sw, 15 + bob, 2, 4, PANTS);
  r(g, cx + 1 - sw, 15 + bob, 2, 4, PANTS);
  r(g, cx - 3 + sw, 17 + bob, 2, 1, PANTS_SH);
  r(g, cx + 1 - sw, 17 + bob, 2, 1, PANTS_SH);
  r(g, cx - 4 + sw, 19 + bob, 3, 1, SHOE);
  r(g, cx + 1 - sw, 19 + bob, 3, 1, SHOE);

  // torso
  r(g, cx - 4, 10 + bob, 8, 6, SHIRT);
  r(g, cx - 4, 14 + bob, 8, 2, SHIRT_SH);
  r(g, cx - 3, 10 + bob, 6, 1, 0x8ab6bd);
  line(g, cx - 4, 10 + bob, 8, 6);

  // arms
  r(g, cx - 5, 11 + bob + (step === 1 ? -1 : 0), 1, 3, SHIRT_SH);
  r(g, cx + 4, 11 + bob + (step === 2 ? -1 : 0), 1, 3, SHIRT_SH);
  r(g, cx - 5, 14 + bob + (step === 1 ? -1 : 0), 1, 1, SKIN);
  r(g, cx + 4, 14 + bob + (step === 2 ? -1 : 0), 1, 1, SKIN);

  // head block (big, chibi) 10 wide
  const hy = 2 + bob;
  r(g, cx - 5, hy, 10, 9, SKIN);
  r(g, cx - 5, hy + 7, 10, 2, SKIN_SH);
  line(g, cx - 5, hy, 10, 9);

  // hair
  if (dir === "up") {
    r(g, cx - 5, hy, 10, 6, HAIR);
    r(g, cx - 4, hy + 1, 8, 1, HAIR_HI);
    line(g, cx - 5, hy, 10, 9);
  } else {
    r(g, cx - 5, hy, 10, 3, HAIR);
    r(g, cx - 4, hy + 1, 5, 1, HAIR_HI);
    if (dir !== "right") r(g, cx - 5, hy + 3, 1, 4, HAIR);
    if (dir !== "left") r(g, cx + 4, hy + 3, 1, 4, HAIR);
    line(g, cx - 5, hy, 10, 9);

    // face: 1px eyes, blush, mouth
    const off = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const ey = hy + 5;
    r(g, cx - 3 + off, ey, 1, 2, INK);
    r(g, cx + 2 + off, ey, 1, 2, INK);
    r(g, cx - 4 + off, ey + 3, 2, 1, 0xd08a7c);
    r(g, cx + 2 + off, ey + 3, 2, 1, 0xd08a7c);
    r(g, cx - 1 + off, ey + 3, 2, 1, 0x9a6558);
  }
};

export const buildTextures = (scene: Phaser.Scene) => {
  for (const dir of ["down", "up", "left", "right"])
    for (const step of [0, 1, 2])
      make(scene, `char-${dir}-${step}`, 16, 21, (g) => drawChar(g, dir, step));

  /* ---- hard-edged dithered halo (replaces the old blur glow) ---- */
  make(scene, "glow", 32, 32, (g) => {
    r(g, 6, 6, 20, 20, 0xffffff, 0.5);
    dither(g, 3, 3, 26, 26, 0xffffff, 0);
    dither(g, 0, 0, 32, 32, 0xffffff, 1);
  });

  // pixel music note
  make(scene, "note", 11, 13, (g) => {
    r(g, 1, 8, 5, 4, INK);
    r(g, 2, 9, 3, 2, 0xffffff);
    r(g, 5, 1, 2, 8, INK);
    r(g, 7, 1, 3, 2, INK);
    r(g, 5, 2, 1, 5, 0xffffff);
  });

  // pixel spark (string lights / sparkle)
  make(scene, "sparkle", 8, 8, (g) => {
    r(g, 3, 1, 2, 6, 0xffffff);
    r(g, 1, 3, 6, 2, 0xffffff);
    r(g, 2, 2, 4, 4, 0xffffff);
  });

  /* ---------------- props: one shared retro tileset ---------------- */

  // speaker 22x31 — cabinet with grille dither + two drivers
  make(scene, "speaker", 22, 31, (g) => {
    foot(g, 11, 29, 16);
    panel(g, 3, 2, 16, 26, 0x5f5560, 0x453d47, 0x7b6f7c);
    dither(g, 5, 4, 12, 22, 0x4d4550);
    // woofer
    r(g, 6, 6, 10, 10, 0x2f2a33);
    line(g, 6, 6, 10, 10);
    r(g, 8, 8, 6, 6, 0x6d6672);
    r(g, 9, 9, 4, 4, 0x2f2a33);
    r(g, 8, 8, 3, 1, 0x8f8896);
    // tweeter
    r(g, 8, 19, 6, 6, 0x2f2a33);
    line(g, 8, 19, 6, 6);
    r(g, 10, 21, 2, 2, 0x6d6672);
  });

  // bulletin board 34x27 — frame, cork dither, pinned notes with pin pixels
  make(scene, "board", 34, 27, (g) => {
    foot(g, 17, 25, 24);
    panel(g, 1, 1, 32, 23, WOOD, WOOD_SH, WOOD_HI);
    r(g, 3, 3, 28, 19, 0xb9955f);
    dither(g, 3, 3, 28, 19, 0xa5814f);
    line(g, 3, 3, 28, 19);
    const notes: Array<[number, number, number, number, number]> = [
      [5, 5, 8, 7, 0xf3ead2],
      [15, 5, 9, 6, 0xe8d7a8],
      [6, 13, 9, 7, 0xe9c9bd],
      [17, 12, 8, 8, 0xc9dbe0],
    ];
    for (const [x, y, w, h, c] of notes) {
      r(g, x, y, w, h, c);
      line(g, x, y, w, h, 0x4a3b36);
      r(g, x + 2, y + 2, w - 4, 1, 0x8b7b70);
      r(g, x + 2, y + 4, w - 5, 1, 0x8b7b70);
      r(g, x + Math.floor(w / 2), y - 1, 1, 2, CORAL); // pin
    }
  });

  // potted plant 22x29
  make(scene, "plant", 22, 29, (g) => {
    foot(g, 11, 27, 14);
    r(g, 10, 6, 2, 12, LEAF_SH);
    const leaf = (x: number, y: number, w: number, h: number) => {
      r(g, x, y, w, h, LEAF);
      r(g, x, y + h - 1, w, 1, LEAF_SH);
      r(g, x + 1, y, w - 2, 1, LEAF_HI);
      line(g, x, y, w, h);
    };
    leaf(6, 2, 10, 5);
    leaf(2, 7, 8, 4);
    leaf(12, 8, 8, 4);
    leaf(5, 12, 7, 4);
    panel(g, 5, 18, 12, 9, 0xb87a5c, 0x94593f, 0xd0987a);
    r(g, 5, 18, 12, 2, 0xc98a68);
  });

  // cat 24x22
  make(scene, "pet", 24, 22, (g) => {
    foot(g, 12, 20, 16);
    r(g, 6, 10, 15, 8, 0xd68b52);
    r(g, 6, 16, 15, 2, 0xb46f3c);
    r(g, 7, 10, 12, 1, 0xe6a771);
    line(g, 6, 10, 15, 8);
    r(g, 20, 6, 2, 6, 0xd68b52);
    line(g, 20, 6, 2, 6);
    // head
    r(g, 2, 5, 10, 9, 0xd68b52);
    r(g, 2, 12, 10, 2, 0xb46f3c);
    r(g, 2, 3, 2, 3, 0xd68b52);
    r(g, 9, 3, 2, 3, 0xd68b52);
    line(g, 2, 5, 10, 9);
    r(g, 4, 8, 1, 2, INK);
    r(g, 8, 8, 1, 2, INK);
    r(g, 6, 10, 2, 1, 0xe9b9a4);
    r(g, 3, 11, 2, 1, 0xc4795a);
    r(g, 8, 11, 2, 1, 0xc4795a);
  });

  // bed 48x36 — headboard, pillow, blanket with fold lines
  make(scene, "bed", 48, 36, (g) => {
    foot(g, 24, 34, 40);
    panel(g, 1, 2, 46, 30, WOOD, WOOD_SH, WOOD_HI); // frame
    r(g, 1, 2, 5, 30, WOOD_SH); // headboard slab
    r(g, 2, 4, 2, 26, WOOD_HI);
    line(g, 1, 2, 5, 30);
    // mattress
    r(g, 6, 4, 40, 26, LINEN);
    r(g, 6, 27, 40, 3, LINEN_SH);
    line(g, 6, 4, 40, 26);
    // pillow
    r(g, 8, 7, 11, 20, CREAM);
    r(g, 8, 24, 11, 3, LINEN_SH);
    line(g, 8, 7, 11, 20);
    r(g, 10, 9, 7, 1, 0xffffff);
    // blanket + fold lines
    r(g, 21, 6, 24, 23, TEAL);
    r(g, 21, 26, 24, 3, 0x47747a);
    r(g, 21, 6, 24, 2, 0x7fabad);
    line(g, 21, 6, 24, 23);
    for (const fy of [12, 18, 23]) r(g, 22, fy, 22, 1, 0x47747a);
    dither(g, 22, 24, 22, 2, 0x47747a);
  });

  // desk 46x28 with monitor + mug
  make(scene, "desk", 46, 28, (g) => {
    foot(g, 23, 26, 36);
    panel(g, 1, 8, 44, 16, WOOD_HI, WOOD_SH, 0xd8b184);
    r(g, 3, 22, 3, 4, WOOD_SH);
    r(g, 40, 22, 3, 4, WOOD_SH);
    // monitor
    panel(g, 13, 0, 18, 10, METAL, METAL_SH, METAL_HI);
    r(g, 15, 2, 14, 6, 0x3b5a63);
    line(g, 15, 2, 14, 6);
    r(g, 16, 3, 5, 1, 0x86b6bf);
    r(g, 20, 10, 4, 2, METAL_SH);
    // mug + papers
    r(g, 35, 11, 5, 5, CORAL);
    line(g, 35, 11, 5, 5);
    r(g, 40, 13, 2, 1, CORAL);
    r(g, 5, 13, 7, 4, CREAM);
    line(g, 5, 13, 7, 4);
  });

  // couch 58x33
  make(scene, "couch", 58, 33, (g) => {
    foot(g, 29, 31, 48);
    panel(g, 1, 2, 56, 24, TEAL, 0x466c70, 0x7ea7aa);
    r(g, 1, 8, 4, 18, 0x466c70); // arms
    r(g, 53, 8, 4, 18, 0x466c70);
    line(g, 1, 2, 56, 24);
    for (const cxp of [6, 30]) {
      r(g, cxp, 10, 22, 12, 0x6f9ea2);
      r(g, cxp, 20, 22, 2, 0x466c70);
      r(g, cxp + 1, 10, 20, 1, 0x8bb7ba);
      line(g, cxp, 10, 22, 12);
    }
    r(g, 5, 26, 4, 3, WOOD_SH);
    r(g, 49, 26, 4, 3, WOOD_SH);
  });

  // low table 38x25 with a book
  make(scene, "table", 38, 25, (g) => {
    foot(g, 19, 23, 30);
    panel(g, 2, 5, 34, 12, WOOD_HI, WOOD_SH, 0xdcb689);
    r(g, 5, 17, 3, 4, WOOD_SH);
    r(g, 30, 17, 3, 4, WOOD_SH);
    r(g, 14, 7, 10, 6, 0xd8c07e);
    r(g, 14, 11, 10, 2, 0xb59d5c);
    line(g, 14, 7, 10, 6);
    r(g, 18, 7, 1, 6, 0x8d7743);
  });

  // tv 46x33
  make(scene, "tv", 46, 33, (g) => {
    foot(g, 23, 31, 34);
    panel(g, 2, 1, 42, 22, 0x4c4650, 0x342f38, 0x6a6370);
    r(g, 5, 4, 36, 15, 0x3d6470);
    dither(g, 5, 4, 36, 15, 0x466f7c);
    line(g, 5, 4, 36, 15);
    r(g, 7, 6, 10, 4, 0x9dc6cf);
    r(g, 19, 23, 8, 4, 0x342f38);
    r(g, 15, 27, 16, 2, 0x4c4650);
    line(g, 15, 27, 16, 2);
  });

  // bookshelf 38x35
  make(scene, "shelf", 38, 35, (g) => {
    foot(g, 19, 33, 30);
    panel(g, 1, 1, 36, 30, WOOD_SH, 0x6d4e33, WOOD);
    r(g, 3, 3, 32, 12, 0x5d4130);
    r(g, 3, 17, 32, 12, 0x5d4130);
    const cols = [CORAL, TEAL, PLUM, 0xd8b25c, LEAF];
    for (let i = 0; i < 5; i++) {
      const c = cols[i]!;
      r(g, 4 + i * 6, 4, 4, 10, c);
      r(g, 4 + i * 6, 12, 4, 2, INK, 0.25);
      line(g, 4 + i * 6, 4, 4, 10);
      r(g, 5 + i * 6, 18, 4, 10, cols[(i + 2) % 5]!);
      line(g, 5 + i * 6, 18, 4, 10);
    }
    r(g, 1, 15, 36, 2, WOOD);
    r(g, 1, 29, 36, 2, WOOD);
  });

  // fridge 30x47
  make(scene, "fridge", 30, 47, (g) => {
    foot(g, 15, 45, 22);
    panel(g, 2, 1, 26, 43, 0xdcd8d0, 0xb4b0a9, 0xf1eee7);
    r(g, 3, 17, 24, 1, 0x9d9a94);
    r(g, 22, 6, 2, 8, METAL_SH);
    r(g, 22, 22, 2, 8, METAL_SH);
    r(g, 6, 23, 8, 6, 0xd8b25c); // magnet note
    line(g, 6, 23, 8, 6);
    r(g, 7, 25, 6, 1, 0x8f7a3e);
    dither(g, 3, 36, 24, 6, 0xc6c2bb);
  });

  // kitchen counter 54x28
  make(scene, "counter", 54, 28, (g) => {
    foot(g, 27, 26, 44);
    panel(g, 1, 2, 52, 22, 0xd9c3a2, 0xb39c7b, 0xeeddbf);
    r(g, 1, 6, 52, 1, 0xb39c7b);
    r(g, 26, 8, 1, 14, 0xb39c7b);
    r(g, 6, 8, 10, 7, METAL); // sink
    r(g, 6, 13, 10, 2, METAL_SH);
    line(g, 6, 8, 10, 7);
    r(g, 10, 5, 1, 4, METAL_HI); // tap
    r(g, 10, 5, 4, 1, METAL_HI);
    r(g, 36, 9, 6, 8, LEAF_SH);
    line(g, 36, 9, 6, 8);
  });

  // vending machine 32x49
  make(scene, "vending", 32, 49, (g) => {
    foot(g, 16, 47, 24);
    panel(g, 1, 1, 30, 44, CORAL, 0x9c5541, 0xd8917a);
    r(g, 3, 4, 19, 29, 0x2b323b); // window
    line(g, 3, 4, 19, 29);
    for (let row = 0; row < 4; row++)
      for (let c = 0; c < 3; c++) {
        const col = [0xd8b25c, TEAL, PLUM, CREAM][(row + c) % 4]!;
        r(g, 5 + c * 6, 6 + row * 7, 4, 5, col);
        r(g, 5 + c * 6, 10 + row * 7, 4, 1, INK, 0.3);
      }
    r(g, 24, 5, 5, 12, CREAM); // keypad
    line(g, 24, 5, 5, 12);
    dither(g, 25, 6, 3, 10, 0xb9ae9a);
    r(g, 24, 20, 5, 9, 0x33262b); // slot
    line(g, 24, 20, 5, 9);
    r(g, 4, 36, 24, 7, 0x9c5541); // tray
    line(g, 4, 36, 24, 7);
  });

  // lost & found crate 30x26
  make(scene, "crate", 30, 26, (g) => {
    foot(g, 15, 24, 22);
    panel(g, 1, 5, 28, 17, WOOD, WOOD_SH, WOOD_HI);
    r(g, 3, 1, 24, 6, WOOD_HI);
    line(g, 3, 1, 24, 6);
    r(g, 1, 12, 28, 1, WOOD_SH);
    r(g, 6, 8, 7, 4, TEAL);
    line(g, 6, 8, 7, 4);
    r(g, 16, 9, 6, 4, CORAL);
    line(g, 16, 9, 6, 4);
    dither(g, 2, 17, 26, 4, WOOD_SH);
  });

  // bench 44x24
  make(scene, "bench", 44, 24, (g) => {
    foot(g, 22, 22, 34);
    panel(g, 2, 8, 40, 8, WOOD, WOOD_SH, WOOD_HI);
    panel(g, 2, 2, 40, 5, WOOD_HI, WOOD_SH, 0xd6ab7d);
    r(g, 5, 16, 3, 5, WOOD_SH);
    r(g, 36, 16, 3, 5, WOOD_SH);
    for (let i = 0; i < 5; i++) r(g, 6 + i * 8, 9, 1, 6, WOOD_SH);
  });

  // tree 56x62 — blocky canopy clusters, no soft circles
  make(scene, "tree", 56, 62, (g) => {
    foot(g, 28, 58, 26);
    r(g, 24, 32, 8, 25, 0x7d5a3c);
    r(g, 24, 32, 2, 25, 0x99724d);
    line(g, 24, 32, 8, 25);
    const blob = (x: number, y: number, w: number, h: number) => {
      r(g, x, y, w, h, LEAF);
      r(g, x + 1, y + 1, w - 2, 2, LEAF_HI);
      r(g, x, y + h - 3, w, 3, LEAF_SH);
      dither(g, x, y + h - 5, w, 2, LEAF_SH);
      line(g, x, y, w, h);
    };
    blob(12, 4, 32, 22);
    blob(4, 16, 18, 14);
    blob(34, 16, 18, 14);
    blob(18, 24, 20, 10);
  });

  // record crate / turntable 28x25
  make(scene, "record", 28, 25, (g) => {
    foot(g, 14, 23, 22);
    panel(g, 1, 3, 26, 18, 0x6a5f68, 0x4c434b, 0x877984);
    r(g, 4, 6, 12, 12, 0x211d24);
    line(g, 4, 6, 12, 12);
    r(g, 8, 10, 4, 4, 0xd8b25c);
    r(g, 9, 11, 2, 2, 0x211d24);
    r(g, 5, 7, 1, 1, 0x7d7482);
    r(g, 19, 6, 6, 8, CORAL);
    line(g, 19, 6, 6, 8);
    r(g, 18, 16, 8, 3, 0x4c434b);
  });

  // woven rug 80x52 — pixel weave, hard edges
  make(scene, "rug", 80, 52, (g) => {
    r(g, 0, 0, 80, 52, 0xc0a98c);
    line(g, 0, 0, 80, 52, 0x8d7659);
    r(g, 2, 2, 76, 48, 0xcdb797);
    dither(g, 2, 2, 76, 48, 0xbca384);
    r(g, 6, 6, 68, 40, 0xb99a78);
    line(g, 6, 6, 68, 40, 0x8d7659);
    dither(g, 8, 8, 64, 36, 0xc8ab88, 1);
    r(g, 16, 14, 48, 24, 0xa98a6b);
    line(g, 16, 14, 48, 24, 0x8d7659);
    dither(g, 18, 16, 44, 20, 0xbb9d7c);
    // fringe
    for (let i = 0; i < 40; i += 2) {
      r(g, i, 0, 1, 2, 0x8d7659);
      r(g, 80 - i - 1, 50, 1, 2, 0x8d7659);
    }
  });

  // locked door 34x47
  make(scene, "lockdoor", 34, 47, (g) => {
    foot(g, 17, 45, 24);
    panel(g, 1, 1, 32, 44, 0x6a6070, 0x4b4453, 0x857c8c);
    r(g, 4, 4, 26, 38, 0x574f60);
    line(g, 4, 4, 26, 38);
    r(g, 6, 6, 22, 15, 0x4b4453);
    r(g, 6, 24, 22, 15, 0x4b4453);
    dither(g, 6, 6, 22, 15, 0x574f60);
    dither(g, 6, 24, 22, 15, 0x574f60);
    r(g, 24, 21, 3, 5, METAL_HI); // handle
    line(g, 24, 21, 3, 5);
  });

  /* ---- sticker icons, 12x12 pixel glyphs (tinted at use site) ---- */
  const stickers: Record<string, (g: G) => void> = {
    "music-note": (g) => {
      r(g, 2, 7, 4, 3, 0xffffff);
      r(g, 5, 2, 2, 6, 0xffffff);
      r(g, 7, 2, 3, 2, 0xffffff);
    },
    skateboard: (g) => {
      r(g, 1, 5, 10, 2, 0xffffff);
      r(g, 2, 7, 2, 2, 0xffffff);
      r(g, 8, 7, 2, 2, 0xffffff);
    },
    book: (g) => {
      r(g, 2, 2, 8, 8, 0xffffff);
      r(g, 5, 2, 2, 8, 0x000000, 0.35);
    },
    pottery: (g) => {
      r(g, 3, 2, 6, 2, 0xffffff);
      r(g, 2, 4, 8, 6, 0xffffff);
    },
    vinyl: (g) => {
      r(g, 3, 1, 6, 10, 0xffffff);
      r(g, 1, 3, 10, 6, 0xffffff);
      r(g, 5, 5, 2, 2, 0x000000, 0.4);
    },
    sneaker: (g) => {
      r(g, 2, 3, 4, 5, 0xffffff);
      r(g, 2, 6, 9, 3, 0xffffff);
    },
  };
  for (const [k, d] of Object.entries(stickers)) make(scene, `sticker-${k}`, 12, 12, d);

  /* ------------- iteration 3: hallway texture + collegiate flavour ------------- */

  // hallway runner segment 16x40 — seamless left/right, woven pixel field
  make(scene, "runner", 16, 40, (g) => {
    r(g, 0, 0, 16, 40, 0xb59a78);
    r(g, 0, 0, 16, 2, 0x8d7659);
    r(g, 0, 38, 16, 2, 0x8d7659);
    r(g, 0, 3, 16, 34, 0xc4ab8a);
    dither(g, 0, 3, 16, 34, 0xb59a78);
    r(g, 0, 7, 16, 26, 0xab8f6d);
    r(g, 0, 7, 16, 1, 0x8d7659);
    r(g, 0, 32, 16, 1, 0x8d7659);
    dither(g, 0, 9, 16, 22, 0xbb9f7c, 1);
    // centre motif band
    r(g, 4, 16, 8, 8, 0x9c7f5e);
    line(g, 4, 16, 8, 8, 0x7d6449);
    r(g, 7, 19, 2, 2, 0xc9b18f);
  });

  // runner end cap 6x40 (fringe)
  make(scene, "runner-cap", 6, 40, (g) => {
    r(g, 2, 0, 4, 40, 0xb59a78);
    r(g, 2, 0, 4, 2, 0x8d7659);
    r(g, 2, 38, 4, 2, 0x8d7659);
    for (let i = 1; i < 39; i += 3) r(g, 0, i, 2, 1, 0x8d7659);
  });

  // doorway mat 14x9 — woven rect with contrasting 1px border
  make(scene, "doormat", 14, 9, (g) => {
    r(g, 0, 0, 14, 9, 0xa89279);
    line(g, 0, 0, 14, 9, 0x4a3b36);
    r(g, 2, 2, 10, 5, 0xbda98c);
    dither(g, 2, 2, 10, 5, 0xa89279);
  });

  // hallway flyer 13x16 — paper with text lines + torn tab strip
  const flyer = (base: number, accent: number) => (g: G) => {
    r(g, 1, 0, 11, 15, base);
    line(g, 1, 0, 11, 15, 0x4a3b36);
    r(g, 3, 2, 7, 2, accent);
    for (const ly of [6, 8, 10]) r(g, 3, ly, 7, 1, 0x8b7b70);
    for (let i = 0; i < 3; i++) r(g, 3 + i * 3, 12, 2, 3, 0xd9cdb4);
    r(g, 6, 0, 1, 2, CORAL); // pin
  };
  make(scene, "flyer-a", 13, 16, flyer(0xf3ead2, CORAL));
  make(scene, "flyer-b", 13, 16, flyer(0xe6dfc6, TEAL));
  make(scene, "flyer-c", 13, 16, flyer(0xf0e0d4, PLUM));
  make(scene, "flyer-d", 13, 16, flyer(0xe9e2d0, 0xd8b25c));

  // away note / mini whiteboard 22x15
  make(scene, "awaynote", 22, 15, (g) => {
    panel(g, 0, 0, 22, 15, 0xe9e6dc, 0xbdb9ae, 0xf7f5ee);
    r(g, 3, 4, 14, 1, 0x7b8f9c);
    r(g, 3, 7, 11, 1, 0x7b8f9c);
    r(g, 3, 10, 8, 1, 0x7b8f9c);
    r(g, 17, 11, 3, 2, CORAL); // marker
  });

  // shoe rack 26x17
  make(scene, "shoerack", 26, 17, (g) => {
    foot(g, 13, 15, 20);
    panel(g, 1, 8, 24, 6, WOOD, WOOD_SH, WOOD_HI);
    r(g, 3, 14, 2, 2, WOOD_SH);
    r(g, 21, 14, 2, 2, WOOD_SH);
    const shoes = [CORAL, TEAL, 0xd8b25c, PLUM];
    shoes.forEach((c, i) => {
      const x = 2 + i * 6;
      r(g, x, 4, 5, 4, c);
      r(g, x, 7, 6, 1, INK);
      line(g, x, 4, 5, 4);
    });
  });

  // trash / recycling bin 13x19
  make(scene, "bin", 13, 19, (g) => {
    foot(g, 6, 17, 11);
    panel(g, 1, 3, 11, 14, 0x8d8a94, 0x63606b, 0xaba7b3);
    r(g, 0, 1, 13, 3, 0x6c6975);
    line(g, 0, 1, 13, 3);
    dither(g, 3, 7, 7, 6, 0x7a7782);
    r(g, 5, 9, 3, 3, 0xd6d2cb);
  });

  // mail cubby cluster 34x24
  make(scene, "cubby", 34, 24, (g) => {
    panel(g, 0, 0, 34, 24, WOOD_SH, 0x6d4e33, WOOD);
    for (let row = 0; row < 3; row++)
      for (let c = 0; c < 4; c++) {
        const x = 2 + c * 8;
        const y = 2 + row * 7;
        r(g, x, y, 7, 6, 0x503626);
        line(g, x, y, 7, 6, 0x3b271b);
        if ((row + c) % 3 === 0) {
          r(g, x + 1, y + 3, 5, 3, CREAM);
          line(g, x + 1, y + 3, 5, 3, 0x8b7b70);
        }
      }
  });

  // room-number placard 26x13
  make(scene, "placard", 26, 13, (g) => {
    panel(g, 0, 0, 26, 13, 0x33292f, 0x241c26, 0x4b3f47);
    r(g, 2, 2, 22, 2, 0x5d5060);
  });
};

