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
  // greyscale base only: setTint multiplies, so any baked hue would crush the tint
  make(scene, "rug", 80, 52, (g) => {
    r(g, 0, 0, 80, 52, 0xc8c2b6);
    line(g, 0, 0, 80, 52, 0x756e62);
    r(g, 2, 2, 76, 48, 0xd2ccc0);
    dither(g, 2, 2, 76, 48, 0xc0b9ac);
    r(g, 6, 6, 68, 40, 0xbcb4a4);
    line(g, 6, 6, 68, 40, 0x756e62);
    dither(g, 8, 8, 64, 36, 0xcac1b0, 1);
    r(g, 16, 14, 48, 24, 0xaba294);
    line(g, 16, 14, 48, 24, 0x756e62);
    dither(g, 18, 16, 44, 20, 0xbfb6a4);
    // fringe
    for (let i = 0; i < 40; i += 2) {
      r(g, i, 0, 1, 2, 0x756e62);
      r(g, 80 - i - 1, 50, 1, 2, 0x756e62);
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
  // greyscale base: tinted at use site, and setTint multiplies
  make(scene, "runner", 16, 40, (g) => {
    r(g, 0, 0, 16, 40, 0xb8b0a2);
    r(g, 0, 0, 16, 2, 0x756e62);
    r(g, 0, 38, 16, 2, 0x756e62);
    r(g, 0, 3, 16, 34, 0xc6beb0);
    dither(g, 0, 3, 16, 34, 0xb8b0a2);
    r(g, 0, 7, 16, 26, 0xada394);
    r(g, 0, 7, 16, 1, 0x756e62);
    r(g, 0, 32, 16, 1, 0x756e62);
    dither(g, 0, 9, 16, 22, 0xbcb4a4, 1);
    // centre motif band
    r(g, 4, 16, 8, 8, 0x9c9284);
    line(g, 4, 16, 8, 8, 0x6e665c);
    r(g, 7, 19, 2, 2, 0xcbc2b0);
  });

  // runner end cap 6x40 (fringe) — greyscale, tinted at use site
  make(scene, "runner-cap", 6, 40, (g) => {
    r(g, 2, 0, 4, 40, 0xb8b0a2);
    r(g, 2, 0, 4, 2, 0x756e62);
    r(g, 2, 38, 4, 2, 0x756e62);
    for (let i = 1; i < 39; i += 3) r(g, 0, i, 2, 1, 0x756e62);
  });

  // doorway mat 14x9 — woven rect with contrasting 1px border
  // greyscale base: tinted per-room at use site, and setTint multiplies
  make(scene, "doormat", 14, 9, (g) => {
    r(g, 0, 0, 14, 9, 0xa9a093);
    line(g, 0, 0, 14, 9, 0x4a3b36);
    r(g, 2, 2, 10, 5, 0xbfb6a6);
    dither(g, 2, 2, 10, 5, 0xa9a093);
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

  /* ------------- iteration 12: poster item + lounge / hallway decor ------------- */

  // wall poster 44x26 — ink frame, flat field, 2-tone motif.
  // field authored in greyscale so setTint (multiply) yields clean accent hues.
  const poster = (motif: (g: G) => void) => (g: G) => {
    r(g, 0, 0, 44, 26, INK);
    r(g, 2, 2, 40, 22, 0xd6cfc4);
    dither(g, 2, 2, 40, 22, 0xc7c0b5);
    line(g, 2, 2, 40, 22, 0x5a5350);
    motif(g);
  };
  // default: banner block + rule bar
  make(scene, "poster", 44, 26, poster((g) => {
    r(g, 8, 5, 28, 9, 0xf2ece0);
    line(g, 8, 5, 28, 9, 0x5a5350);
    r(g, 10, 8, 24, 2, 0x8b847e);
    r(g, 13, 18, 18, 3, 0x3f3a38);
  }));
  // band poster: silhouette figures + set list lines
  make(scene, "poster-band", 44, 26, poster((g) => {
    for (let i = 0; i < 4; i++) {
      r(g, 7 + i * 8, 12 - (i % 2), 4, 8, 0x3f3a38);
      r(g, 8 + i * 8, 9 - (i % 2), 2, 3, 0x3f3a38);
    }
    r(g, 7, 4, 30, 3, 0xf2ece0);
    line(g, 7, 4, 30, 3, 0x5a5350);
  }));
  // movie poster: big letterbox frame + credits block
  make(scene, "poster-film", 44, 26, poster((g) => {
    r(g, 6, 4, 32, 13, 0x2f2b2a);
    line(g, 6, 4, 32, 13, 0x5a5350);
    r(g, 9, 7, 12, 7, 0xa39c93);
    dither(g, 21, 7, 14, 7, 0x6d6763);
    for (const ly of [19, 21]) r(g, 10, ly, 24, 1, 0x5a5350);
  }));

  // game console 22x13 — flat box, power dot, cable, disc slot
  make(scene, "console", 22, 13, (g) => {
    foot(g, 11, 11, 16);
    panel(g, 2, 2, 18, 8, 0x3d3a45, 0x2a2830, 0x565261);
    r(g, 4, 5, 11, 1, 0x211f26);
    r(g, 17, 4, 2, 2, 0x7fd6b0);
    r(g, 20, 8, 2, 1, 0x211f26);
  });

  // controller 12x9
  make(scene, "controller", 12, 9, (g) => {
    r(g, 1, 2, 10, 5, 0x4a4753);
    r(g, 0, 3, 2, 4, 0x4a4753);
    r(g, 10, 3, 2, 4, 0x4a4753);
    line(g, 1, 2, 10, 5);
    r(g, 3, 4, 2, 1, 0xcfc9d6);
    r(g, 7, 4, 1, 1, CORAL);
    r(g, 8, 5, 1, 1, TEAL);
  });

  // foosball table 62x38 — green field, ink rods, tiny players, goal boxes
  make(scene, "foosball", 62, 38, (g) => {
    foot(g, 31, 36, 48);
    panel(g, 1, 4, 60, 27, WOOD_SH, 0x6d4e33, WOOD);
    r(g, 4, 7, 54, 20, 0x4f7a4c);
    line(g, 4, 7, 54, 20, 0x2d4a2c);
    r(g, 30, 7, 1, 20, 0x6a9464);
    for (const rx of [11, 22, 33, 44]) {
      r(g, rx, 5, 1, 24, METAL_HI);
      for (const py2 of [10, 17, 23]) {
        r(g, rx - 1, py2, 3, 4, rx % 22 === 0 ? CORAL : CREAM);
        line(g, rx - 1, py2, 3, 4);
      }
    }
    r(g, 1, 13, 3, 8, 0x2f2a33);
    r(g, 58, 13, 3, 8, 0x2f2a33);
    r(g, 5, 31, 4, 5, WOOD_SH);
    r(g, 53, 31, 4, 5, WOOD_SH);
  });

  // beanbag 28x20 — slumped blocky silhouette, greyscale for clean tinting
  make(scene, "beanbag", 28, 20, (g) => {
    foot(g, 14, 18, 20);
    r(g, 3, 6, 22, 11, 0xc9c3ba);
    r(g, 5, 3, 18, 4, 0xd8d2c9);
    r(g, 3, 14, 22, 3, 0xa39d94);
    line(g, 3, 6, 22, 11, 0x4c4740);
    line(g, 5, 3, 18, 4, 0x4c4740);
    dither(g, 6, 12, 16, 2, 0xb5afa6);
    r(g, 8, 5, 6, 1, 0xe6e0d6);
  });

  // snack shelf 28x24 — two shelves of chip bags and cups
  make(scene, "snackshelf", 28, 24, (g) => {
    foot(g, 14, 22, 20);
    panel(g, 1, 1, 26, 20, WOOD, WOOD_SH, WOOD_HI);
    r(g, 3, 3, 22, 7, 0x6d5138);
    r(g, 3, 12, 22, 7, 0x6d5138);
    const cols = [CORAL, 0xd8b25c, TEAL, PLUM];
    cols.forEach((c, i) => {
      r(g, 4 + i * 5, 4, 4, 5, c);
      line(g, 4 + i * 5, 4, 4, 5);
      r(g, 5 + i * 5, 13, 3, 5, cols[(i + 1) % 4]!);
      line(g, 5 + i * 5, 13, 3, 5);
    });
    r(g, 1, 10, 26, 2, WOOD_HI);
  });

  // floor lamp 20x44 — warm shade, thin pole, weighted base
  make(scene, "lamp", 20, 44, (g) => {
    foot(g, 10, 42, 12);
    r(g, 4, 2, 12, 9, 0xe8c98b);
    r(g, 5, 3, 10, 2, 0xf6e2ae);
    r(g, 4, 9, 12, 2, 0xc9a86b);
    line(g, 4, 2, 12, 9);
    r(g, 9, 11, 2, 26, METAL_SH);
    r(g, 9, 11, 1, 26, METAL_HI);
    r(g, 5, 37, 10, 3, 0x4c4750);
    line(g, 5, 37, 10, 3);
  });

  // bike 46x30 — side view, ink frame, spoked wheels
  make(scene, "bike", 46, 30, (g) => {
    foot(g, 23, 28, 34);
    const wheel = (cx: number) => {
      r(g, cx - 8, 12, 16, 14, INK);
      r(g, cx - 6, 14, 12, 10, 0x8f8a83);
      r(g, cx - 4, 16, 8, 6, 0x2f2a33);
      r(g, cx - 1, 14, 2, 10, 0x8f8a83);
      r(g, cx - 6, 18, 12, 2, 0x8f8a83);
    };
    wheel(9);
    wheel(37);
    r(g, 10, 12, 26, 2, TEAL);
    r(g, 13, 6, 2, 7, TEAL);
    r(g, 26, 5, 2, 8, TEAL);
    r(g, 20, 8, 8, 2, TEAL);
    r(g, 10, 4, 7, 2, 0x2f2a33); // handlebars
    r(g, 25, 3, 6, 2, 0x33292f); // saddle
  });

  /* ------------- iteration 13: shop catalog expansion ------------- */

  // lava lamp 16x34 — conical base, glass bulb, drifting blobs
  make(scene, "lavalamp", 16, 34, (g) => {
    foot(g, 8, 32, 12);
    r(g, 4, 27, 8, 4, METAL_SH);
    r(g, 3, 30, 10, 2, METAL);
    line(g, 3, 27, 10, 5);
    r(g, 5, 6, 6, 21, 0xd76a8c);
    r(g, 5, 6, 2, 21, 0xe9899f);
    line(g, 5, 6, 6, 21);
    for (const [by, bh] of [[10, 3], [16, 2], [21, 3]] as const)
      r(g, 6, by, 4, bh, 0xf6c3a1);
    r(g, 5, 2, 6, 4, METAL);
    line(g, 5, 2, 6, 4);
  });

  // mini disco ball 22x30 — chain + faceted greyscale sphere (tints cleanly)
  make(scene, "discoball", 22, 30, (g) => {
    r(g, 10, 0, 2, 8, METAL_SH);
    r(g, 4, 8, 14, 14, 0xb9b4bd);
    line(g, 4, 8, 14, 14);
    for (let yy = 0; yy < 12; yy++)
      for (let xx = 0; xx < 12; xx++)
        if ((xx + yy) % 3 === 0) r(g, 5 + xx, 9 + yy, 1, 1, 0xecebef);
        else if ((xx * yy) % 5 === 0) r(g, 5 + xx, 9 + yy, 1, 1, 0x807c85);
    for (const [sx, sy] of [[1, 24], [19, 25], [10, 27]] as const)
      r(g, sx, sy, 2, 2, 0xf6f2e2);
  });

  // tabletop arcade cabinet 26x38 — marquee, screen, joystick, buttons
  make(scene, "arcade", 26, 38, (g) => {
    foot(g, 13, 36, 20);
    panel(g, 2, 2, 22, 33, 0x4a3d5c, 0x33294a, 0x62537a);
    r(g, 5, 4, 16, 5, 0xf0d47a);
    line(g, 5, 4, 16, 5);
    r(g, 5, 11, 16, 12, 0x1d2430);
    line(g, 5, 11, 16, 12);
    dither(g, 7, 13, 12, 8, 0x3f7ea8);
    r(g, 9, 15, 3, 3, 0x8fe0c0);
    r(g, 14, 18, 2, 2, CORAL);
    r(g, 7, 26, 3, 4, METAL_HI);
    r(g, 6, 29, 5, 2, 0x33292f);
    for (let i = 0; i < 3; i++) r(g, 14 + i * 3, 27, 2, 2, [CORAL, 0xd8b25c, TEAL][i]!);
  });

  // hammock chair 34x40 — ceiling rope + woven hanging bowl
  make(scene, "hammock", 34, 40, (g) => {
    r(g, 16, 0, 2, 9, 0xbca77e);
    r(g, 6, 9, 22, 2, 0x8b6543);
    r(g, 5, 11, 24, 15, 0xd9cbb0);
    r(g, 5, 22, 24, 4, 0xb8a988);
    line(g, 5, 11, 24, 15);
    dither(g, 7, 13, 20, 10, 0xc4b696);
    for (let i = 0; i < 5; i++) r(g, 8 + i * 4, 26, 2, 5, 0xbca77e);
    r(g, 9, 14, 8, 5, CREAM);
    line(g, 9, 14, 8, 5);
  });

  // neon "VIBES" sign 40x18 — glowing tube letters over dark backer
  make(scene, "neon", 40, 18, (g) => {
    r(g, 0, 0, 40, 18, 0x231d2c);
    line(g, 0, 0, 40, 18);
    dither(g, 2, 2, 36, 14, 0x2f2739);
    const glyph = (x: number, cols: number[]) => {
      for (const c of cols) r(g, x + c, 4, 1, 9, 0xf07ab8);
      r(g, x, 4, 5, 1, 0xf07ab8);
      r(g, x, 12, 5, 1, 0xf07ab8);
    };
    for (let i = 0; i < 5; i++) glyph(4 + i * 7, [0, 4]);
    dither(g, 3, 3, 34, 12, 0xffb7dd);
  });

  // papasan chair 36x28 — round woven bowl on a low frame
  make(scene, "papasan", 36, 28, (g) => {
    foot(g, 18, 26, 26);
    r(g, 4, 6, 28, 14, 0xd6c7a6);
    r(g, 2, 9, 32, 8, 0xd6c7a6);
    r(g, 4, 15, 28, 5, 0xb39f7d);
    line(g, 4, 6, 28, 14);
    dither(g, 6, 8, 24, 9, 0xc4b48f);
    r(g, 8, 8, 20, 5, CREAM);
    line(g, 8, 8, 20, 5);
    r(g, 7, 20, 22, 3, 0x6d5138);
    line(g, 7, 20, 22, 3);
  });

  // vinyl crate 30x24 — wood crate stuffed with record sleeves
  make(scene, "vinylcrate", 30, 24, (g) => {
    foot(g, 15, 22, 22);
    panel(g, 2, 6, 26, 15, WOOD, WOOD_SH, WOOD_HI);
    const sleeves = [CORAL, 0xd8b25c, TEAL, PLUM, 0x8f8a83];
    sleeves.forEach((c, i) => {
      r(g, 4 + i * 5, 2, 4, 12, c);
      line(g, 4 + i * 5, 2, 4, 12);
      r(g, 5 + i * 5, 4, 2, 2, CREAM);
    });
    r(g, 2, 14, 26, 2, WOOD_SH);
  });

  // projector + pull-down screen 44x34
  make(scene, "projector", 44, 34, (g) => {
    r(g, 4, 0, 34, 3, 0x4c4750);
    r(g, 6, 3, 30, 20, 0xe8e3d6);
    line(g, 6, 3, 30, 20);
    dither(g, 8, 5, 26, 16, 0xd4cfc2);
    r(g, 6, 21, 30, 2, 0x8f8a83);
    foot(g, 22, 32, 18);
    panel(g, 14, 25, 16, 7, 0x3d3a45, 0x2a2830, 0x565261);
    r(g, 29, 27, 2, 3, 0xf6e2ae);
    r(g, 16, 27, 4, 1, 0x211f26);
  });

  // canopy bed 52x44 — four posts, fairy lights strung across the top rail
  make(scene, "canopybed", 52, 44, (g) => {
    foot(g, 26, 42, 40);
    for (const px of [2, 46]) r(g, px, 2, 4, 38, WOOD_SH);
    r(g, 2, 2, 48, 3, WOOD);
    line(g, 2, 2, 48, 3);
    for (let i = 0; i < 8; i++) r(g, 6 + i * 6, 5, 2, 2, 0xffe3a6);
    panel(g, 7, 14, 38, 24, LINEN, LINEN_SH, 0xf6efdd);
    r(g, 9, 16, 34, 7, 0xc0d2d6);
    line(g, 9, 16, 34, 7);
    dither(g, 10, 26, 32, 8, LINEN_SH);
    r(g, 12, 17, 12, 4, CREAM);
    line(g, 12, 17, 12, 4);
  });

  // floor cushion stack 30x22 — three squishy cushions, greyscale for tinting
  make(scene, "cushions", 30, 22, (g) => {
    foot(g, 15, 20, 22);
    const cushion = (y: number, w: number, tone: number) => {
      const x = 15 - w / 2;
      r(g, x, y, w, 5, tone);
      r(g, x, y + 3, w, 2, 0xa39d94);
      line(g, x, y, w, 5);
      dither(g, x + 2, y + 1, w - 4, 2, 0xb5afa6);
    };
    cushion(14, 24, 0xc9c3ba);
    cushion(9, 22, 0xd8d2c9);
    cushion(4, 18, 0xe6e0d6);
  });

  // hamster + wheel 26x24
  make(scene, "hamster", 26, 24, (g) => {
    foot(g, 13, 22, 18);
    r(g, 3, 3, 18, 18, METAL_HI);
    r(g, 5, 5, 14, 14, 0xdfd9cf, 0.35);
    line(g, 3, 3, 18, 18);
    for (let i = 0; i < 4; i++) r(g, 4 + i * 4, 4, 1, 16, METAL_SH);
    r(g, 9, 10, 8, 7, 0xe0b98a);
    r(g, 9, 14, 8, 3, 0xc59a6b);
    line(g, 9, 10, 8, 7);
    r(g, 11, 12, 1, 1, INK);
    r(g, 15, 12, 1, 1, INK);
    r(g, 20, 19, 5, 3, 0x6d5138);
  });

  // betta fish bowl 24x24
  make(scene, "betta", 24, 24, (g) => {
    foot(g, 12, 22, 16);
    r(g, 4, 4, 16, 16, 0x9fc9d4, 0.55);
    line(g, 4, 4, 16, 16);
    r(g, 6, 6, 4, 12, 0xc7e2e8, 0.5);
    r(g, 10, 10, 6, 4, 0xc8547e);
    r(g, 8, 11, 2, 2, 0xc8547e);
    r(g, 16, 9, 3, 6, 0x8b3f66);
    r(g, 14, 11, 1, 1, CREAM);
    r(g, 5, 17, 14, 3, 0xb59f7d);
    r(g, 5, 20, 14, 2, METAL_SH);
  });

  // axolotl tank 34x26
  make(scene, "axolotl", 34, 26, (g) => {
    foot(g, 17, 24, 26);
    r(g, 2, 3, 30, 19, 0x8fbfc9, 0.5);
    line(g, 2, 3, 30, 19);
    r(g, 3, 17, 28, 4, 0xd8cdb2);
    dither(g, 3, 15, 28, 2, 0xc0b493);
    r(g, 10, 11, 13, 5, 0xf0b9c6);
    r(g, 21, 9, 5, 5, 0xf0b9c6);
    line(g, 10, 11, 13, 5);
    for (const fy of [8, 10, 12]) r(g, 26, fy, 4, 1, 0xf6d3dc);
    r(g, 24, 10, 1, 1, INK);
    r(g, 6, 9, 2, 8, LEAF);
    r(g, 28, 12, 2, 5, LEAF_SH);
  });

  // corgi 26x20 — long low body, stubby legs, big ears
  make(scene, "corgi", 26, 20, (g) => {
    foot(g, 13, 18, 20);
    r(g, 4, 7, 16, 8, 0xd8a45e);
    r(g, 4, 12, 16, 3, 0xb5813f);
    line(g, 4, 7, 16, 8);
    r(g, 6, 10, 10, 4, CREAM);
    r(g, 16, 3, 8, 7, 0xd8a45e);
    line(g, 16, 3, 8, 7);
    r(g, 17, 0, 2, 4, 0xb5813f);
    r(g, 22, 0, 2, 4, 0xb5813f);
    r(g, 21, 6, 1, 1, INK);
    r(g, 23, 7, 2, 2, INK);
    r(g, 18, 8, 5, 2, CREAM);
    for (const lx of [5, 10, 15]) r(g, lx, 15, 3, 3, CREAM);
    r(g, 2, 6, 3, 4, 0xe6bd82);
  });

  // bonsai 28x30 — shallow pot, gnarled trunk, flat canopy pads
  make(scene, "bonsai", 28, 30, (g) => {
    foot(g, 14, 28, 20);
    r(g, 12, 12, 3, 12, 0x6d5138);
    r(g, 14, 15, 6, 2, 0x6d5138);
    r(g, 8, 17, 5, 2, 0x6d5138);
    r(g, 6, 6, 14, 6, LEAF);
    r(g, 6, 10, 14, 2, LEAF_SH);
    line(g, 6, 6, 14, 6);
    dither(g, 8, 7, 10, 3, LEAF_HI);
    r(g, 17, 12, 9, 5, LEAF);
    line(g, 17, 12, 9, 5);
    r(g, 4, 15, 8, 4, LEAF);
    line(g, 4, 15, 8, 4);
    panel(g, 6, 23, 16, 5, 0x8b5a4a, 0x6b4238, 0xa4715c);
  });

  /* ---- wallpaper swatches (thumbnail-only 24x24 pattern chips) ---- */
  const swatch = (draw: (g: G) => void) => (g: G) => {
    draw(g);
    line(g, 0, 0, 24, 24);
  };
  make(scene, "wallpaper_sunset", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0xe8a978);
    r(g, 0, 0, 24, 8, 0xf0c79a);
    dither(g, 0, 8, 24, 6, 0xd98a6c);
    r(g, 0, 16, 24, 8, 0xc8765c);
  }));
  make(scene, "wallpaper_stripes", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0xf3e6ec);
    for (let i = 0; i < 6; i++) r(g, 2 + i * 4, 0, 2, 24, 0xd7b9cf);
  }));
  make(scene, "wallpaper_checker", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0xefe6d2);
    for (let yy = 0; yy < 4; yy++)
      for (let xx = 0; xx < 4; xx++)
        if ((xx + yy) % 2 === 0) r(g, xx * 6, yy * 6, 6, 6, 0x4c4750);
  }));
  make(scene, "wallpaper_botanical", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0xe6e9da);
    for (const [lx, ly] of [[4, 4], [14, 8], [7, 15], [17, 17]] as const) {
      r(g, lx, ly, 4, 2, LEAF);
      r(g, lx + 1, ly - 2, 2, 5, LEAF_SH);
    }
  }));
  make(scene, "wallpaper_night", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0x2b3350);
    dither(g, 0, 0, 24, 24, 0x333c5e);
    for (const [sx, sy] of [[3, 5], [10, 3], [18, 8], [6, 16], [20, 18], [14, 13]] as const)
      r(g, sx, sy, 1, 1, 0xf6f2e2);
    r(g, 16, 4, 3, 3, 0xf0e4cd);
  }));
  make(scene, "wallpaper_graph", 24, 24, swatch((g) => {
    r(g, 0, 0, 24, 24, 0xeef1e8);
    for (let i = 0; i < 6; i++) {
      r(g, i * 4, 0, 1, 24, 0xb9c9c0);
      r(g, 0, i * 4, 24, 1, 0xb9c9c0);
    }
  }));

  /* ---- new posters (same greyscale-field frame, distinct motifs) ---- */
  // tour poster: bold type block over a lone silhouette + date rows
  make(scene, "poster-tour", 44, 26, poster((g) => {
    r(g, 6, 3, 32, 4, 0x2f2b2a);
    r(g, 19, 9, 6, 11, 0x3f3a38);
    r(g, 20, 6, 4, 3, 0x3f3a38);
    r(g, 14, 12, 5, 2, 0x3f3a38);
    r(g, 25, 12, 5, 2, 0x3f3a38);
    for (const ly of [21, 23]) r(g, 8, ly, 28, 1, 0x5a5350);
  }));
  // travel poster: stylized skyline + sun disc
  make(scene, "poster-travel", 44, 26, poster((g) => {
    r(g, 28, 6, 7, 7, 0xf2ece0);
    line(g, 28, 6, 7, 7, 0x5a5350);
    const towers: Array<[number, number, number]> = [
      [6, 12, 5], [12, 8, 4], [17, 14, 6], [24, 10, 5], [30, 15, 6], [37, 11, 4],
    ];
    for (const [tx, ty, tw] of towers) {
      r(g, tx, ty, tw, 20 - ty + 2, 0x3f3a38);
      r(g, tx + 1, ty + 2, 1, 1, 0xd6cfc4);
    }
    r(g, 4, 21, 36, 2, 0x5a5350);
  }));
  // space print: planet, ring, star field
  make(scene, "poster-space", 44, 26, poster((g) => {
    r(g, 4, 4, 36, 18, 0x2f2b2a);
    line(g, 4, 4, 36, 18, 0x5a5350);
    dither(g, 6, 6, 32, 14, 0x453f3e);
    r(g, 18, 9, 9, 9, 0xa39c93);
    r(g, 18, 14, 9, 4, 0x6d6763);
    r(g, 13, 12, 19, 1, 0xd6cfc4);
    for (const [sx, sy] of [[8, 7], [34, 8], [11, 18], [31, 17]] as const)
      r(g, sx, sy, 1, 1, 0xf2ece0);
  }));
  // abstract print: overlapping blocks + arc
  make(scene, "poster-abstract", 44, 26, poster((g) => {
    r(g, 7, 5, 14, 14, 0x3f3a38);
    r(g, 17, 10, 12, 9, 0xa39c93);
    line(g, 17, 10, 12, 9, 0x5a5350);
    r(g, 27, 4, 10, 10, 0xf2ece0);
    line(g, 27, 4, 10, 10, 0x5a5350);
    dither(g, 29, 6, 6, 6, 0x8b847e);
    r(g, 8, 21, 28, 2, 0x5a5350);
  }));
  // quote poster: fake type lines with an oversized opening mark
  make(scene, "poster-quote", 44, 26, poster((g) => {
    r(g, 6, 4, 3, 5, 0x3f3a38);
    r(g, 11, 4, 3, 5, 0x3f3a38);
    for (const [ly, lw] of [[11, 30], [14, 26], [17, 20]] as const)
      r(g, 7, ly, lw, 2, 0x5a5350);
    r(g, 7, 21, 10, 1, 0x8b847e);
  }));

  /* ------------- iteration 14: speaker + tv variants ------------- */

  // boombox 30x20 — carry handle, twin round-ish drivers, cassette deck panel
  make(scene, "boombox", 30, 20, (g) => {
    foot(g, 15, 18, 22);
    r(g, 10, 1, 10, 1, 0x3a3440);
    r(g, 10, 1, 1, 4, 0x3a3440);
    r(g, 19, 1, 1, 4, 0x3a3440);
    panel(g, 1, 4, 28, 13, 0x5f5560, 0x453d47, 0x7b6f7c);
    for (const cx of [5, 20]) {
      r(g, cx, 7, 6, 6, 0x2f2a33);
      line(g, cx, 7, 6, 6);
      r(g, cx + 1, 8, 4, 4, 0x6d6672);
      r(g, cx + 2, 9, 2, 2, 0x2f2a33);
    }
    r(g, 12, 7, 7, 4, 0x342f38);
    line(g, 12, 7, 7, 4);
    r(g, 13, 8, 2, 2, 0x9dc6cf);
    r(g, 16, 8, 2, 2, 0x9dc6cf);
    r(g, 12, 13, 7, 1, 0x8f8896);
    r(g, 13, 15, 2, 1, 0x7fd6b0);
  });

  // tower speaker 16x44 — narrow floor-standing silhouette, three drivers
  make(scene, "tower", 16, 44, (g) => {
    foot(g, 8, 42, 12);
    panel(g, 2, 1, 12, 40, 0x4a444f, 0x332f38, 0x655e6c);
    dither(g, 3, 3, 10, 36, 0x413b46);
    for (const [cy, s] of [[4, 8], [15, 8], [27, 6]] as const) {
      r(g, (16 - s) / 2, cy, s, s, 0x2b262f);
      line(g, (16 - s) / 2, cy, s, s);
      r(g, (16 - s) / 2 + 2, cy + 2, s - 4, s - 4, 0x6d6672);
    }
    r(g, 6, 36, 4, 1, 0x8f8896);
  });

  // vintage hi-fi cabinet 30x24 — wood panel, cloth grille, brass knobs
  make(scene, "hifi", 30, 24, (g) => {
    foot(g, 15, 22, 24);
    panel(g, 1, 2, 28, 19, WOOD, 0x6d4e33, WOOD_HI);
    r(g, 3, 5, 17, 13, 0xbaa98c);
    dither(g, 3, 5, 17, 13, 0xa39374);
    line(g, 3, 5, 17, 13, 0x5a4432);
    r(g, 22, 5, 5, 13, 0x6d4e33);
    line(g, 22, 5, 5, 13, 0x4a3324);
    for (const ky of [7, 12]) {
      r(g, 23, ky, 3, 3, 0xd8b25c);
      line(g, 23, ky, 3, 3, 0x8a6c2f);
      r(g, 24, ky + 1, 1, 1, 0xf2e0ad);
    }
    r(g, 23, 16, 3, 1, 0xd8b25c);
    r(g, 4, 20, 22, 1, 0x4a3324);
  });

  // CRT tube TV 34x32 — deep boxy body, curved-look bezel, rabbit-ear antenna
  make(scene, "crt", 34, 32, (g) => {
    foot(g, 17, 30, 26);
    r(g, 15, 0, 1, 6, 0x3a3440);
    r(g, 12, 1, 3, 3, 0x3a3440);
    r(g, 19, 0, 1, 6, 0x3a3440);
    r(g, 20, 1, 3, 3, 0x3a3440);
    panel(g, 2, 5, 30, 23, 0x6b5f52, 0x4b423a, 0x8a7c6c);
    r(g, 4, 8, 20, 15, 0x2f3a3d);
    line(g, 4, 8, 20, 15);
    dither(g, 5, 9, 18, 13, 0x3b4a4e);
    r(g, 6, 10, 7, 4, 0x9dc6cf);
    r(g, 26, 9, 4, 4, 0x342f38);
    line(g, 26, 9, 4, 4);
    r(g, 27, 15, 2, 2, 0xd8b25c);
    r(g, 26, 19, 4, 1, 0x4b423a);
  });

  // mounted flatscreen + soundbar 48x30 — slim panel, wall bracket, bar beneath
  make(scene, "flatscreen", 48, 30, (g) => {
    r(g, 2, 1, 44, 17, INK);
    r(g, 4, 3, 40, 13, 0x33454c);
    dither(g, 4, 3, 40, 13, 0x3c5158);
    r(g, 6, 5, 12, 4, 0x9dc6cf);
    r(g, 30, 11, 10, 3, 0x6f939c);
    r(g, 22, 18, 4, 3, 0x342f38);
    panel(g, 8, 21, 32, 6, 0x4c4650, 0x342f38, 0x6a6370);
    for (let i = 0; i < 12; i++) r(g, 11 + i * 2, 23, 1, 2, 0x2b262f);
    foot(g, 24, 28, 30);
  });

  // gamer TV setup 46x36 — screen on a stand with a console box + controller
  make(scene, "tvgaming", 46, 36, (g) => {
    foot(g, 23, 34, 36);
    r(g, 1, 1, 34, 20, INK);
    r(g, 3, 3, 30, 16, 0x2f3f4a);
    dither(g, 3, 3, 30, 16, 0x3a4d59);
    r(g, 5, 5, 9, 4, 0x9dc6cf);
    r(g, 20, 13, 9, 3, 0x7fd6b0);
    r(g, 16, 21, 4, 3, 0x342f38);
    panel(g, 1, 24, 44, 8, 0x6b5f52, 0x4b423a, 0x8a7c6c);
    // console box on the shelf
    panel(g, 26, 17, 16, 7, 0x3d3a45, 0x2a2830, 0x565261);
    r(g, 28, 19, 9, 1, 0x211f26);
    r(g, 39, 19, 2, 2, 0x7fd6b0);
    // controller resting on the stand
    r(g, 5, 26, 9, 4, 0x4a4753);
    line(g, 5, 26, 9, 4);
    r(g, 7, 27, 2, 1, 0x9a94a4);
    r(g, 11, 27, 1, 1, 0xd97b6c);
  });

  /* ------------- iteration 14: zoomed poster art (popup viewer) ------------- */

  // 90x55 art px (=180x110 canvas) — real motif content, not an upscale.
  const ZF = 0xe9e2d4; // paper field
  const ZI = 0x3f3a38; // ink motif
  const ZM = 0x8b847e; // mid tone
  const ZL = 0xf6f1e6; // paper highlight
  const zoom = (field: number, draw: (g: G) => void) => (g: G) => {
    r(g, 0, 0, 90, 55, INK);
    r(g, 2, 2, 86, 51, field);
    line(g, 4, 4, 82, 47, 0x6b625c);
    draw(g);
  };
  const typeLine = (g: G, x: number, y: number, w: number, c = ZM) => r(g, x, y, w, 2, c);

  // default: gallery banner with a rule bar and caption lines
  make(scene, "poster-zoom", 90, 55, zoom(ZF, (g) => {
    r(g, 12, 9, 66, 18, ZL);
    line(g, 12, 9, 66, 18, 0x6b625c);
    r(g, 18, 15, 54, 4, ZI);
    r(g, 18, 21, 34, 2, ZM);
    typeLine(g, 20, 34, 50);
    typeLine(g, 20, 39, 38);
    r(g, 20, 45, 18, 3, 0xc8765c);
  }));

  // band: lone silhouette figure with mic stand + bold pixel-type title bar
  make(scene, "poster-band-zoom", 90, 55, zoom(0x2f2b2a, (g) => {
    dither(g, 6, 6, 78, 43, 0x3a3534);
    r(g, 8, 8, 74, 9, 0xd8b25c);
    for (let i = 0; i < 6; i++) r(g, 12 + i * 12, 10, 8, 5, 0x2f2b2a);
    // figure
    r(g, 42, 24, 8, 6, 0x1f1c1c);
    r(g, 40, 30, 12, 14, 0x1f1c1c);
    r(g, 36, 32, 4, 9, 0x1f1c1c);
    r(g, 52, 31, 4, 8, 0x1f1c1c);
    r(g, 41, 44, 4, 6, 0x1f1c1c);
    r(g, 47, 44, 4, 6, 0x1f1c1c);
    r(g, 34, 26, 3, 3, 0xd8b25c); // mic
    r(g, 35, 29, 1, 14, 0x6b625c);
    for (const [ly, lw] of [[26, 20], [31, 16], [36, 22]] as const) {
      typeLine(g, 8, ly, lw, 0x8f8a86);
      typeLine(g, 64, ly, lw - 4, 0x8f8a86);
    }
  }));

  // film: letterbox still + credits block
  make(scene, "poster-film-zoom", 90, 55, zoom(0x2a2726, (g) => {
    r(g, 8, 8, 74, 28, 0x1c1a1a);
    line(g, 8, 8, 74, 28, 0x6b625c);
    r(g, 12, 14, 30, 18, 0x8f8a86);
    dither(g, 42, 12, 36, 20, 0x4a4544);
    r(g, 20, 20, 10, 8, 0xd9d2c4);
    typeLine(g, 12, 40, 66, 0x8f8a86);
    typeLine(g, 12, 45, 44, 0x6b625c);
    r(g, 66, 44, 12, 4, 0xc8765c);
  }));

  // tour: type block, silhouette, date rows
  make(scene, "poster-tour-zoom", 90, 55, zoom(0xe4d8bf, (g) => {
    r(g, 8, 7, 74, 8, ZI);
    r(g, 12, 9, 20, 4, 0xe4d8bf);
    r(g, 36, 9, 14, 4, 0xe4d8bf);
    r(g, 54, 9, 24, 4, 0xe4d8bf);
    r(g, 40, 22, 10, 18, ZI);
    r(g, 41, 17, 8, 5, ZI);
    r(g, 30, 26, 10, 3, ZI);
    r(g, 50, 26, 10, 3, ZI);
    for (const ly of [44, 48]) {
      typeLine(g, 10, ly, 30, 0x8b7f66);
      typeLine(g, 52, ly, 28, 0x8b7f66);
    }
  }));

  // travel: stylized city skyline silhouette under a sun disc
  make(scene, "poster-travel-zoom", 90, 55, zoom(0xf0d9b5, (g) => {
    r(g, 6, 6, 78, 24, 0xf3c98a);
    r(g, 60, 10, 14, 14, 0xe98d70);
    line(g, 60, 10, 14, 14, 0xa85c48);
    const towers: Array<[number, number, number]> = [
      [8, 22, 8], [17, 16, 7], [25, 26, 6], [32, 12, 9], [42, 20, 7],
      [50, 24, 6], [57, 17, 8], [66, 23, 7], [74, 14, 8],
    ];
    for (const [tx, ty, tw] of towers) {
      r(g, tx, ty, tw, 40 - ty, 0x3c4a55);
      for (let wy = ty + 3; wy < 38; wy += 5)
        for (let wx = tx + 2; wx < tx + tw - 1; wx += 3) r(g, wx, wy, 1, 2, 0xf3c98a);
    }
    r(g, 6, 40, 78, 3, 0x2c3742);
    typeLine(g, 22, 47, 46, 0x6f6353);
  }));

  // space: ringed planet, moon, star field
  make(scene, "poster-space-zoom", 90, 55, zoom(0x191d33, (g) => {
    dither(g, 6, 6, 78, 43, 0x212747);
    for (const [sx, sy] of [
      [10, 10], [22, 15], [34, 8], [50, 12], [66, 9], [78, 18],
      [14, 34], [28, 42], [44, 46], [62, 38], [76, 44], [8, 22],
    ] as const)
      r(g, sx, sy, 1, 1, 0xf6f2e2);
    r(g, 34, 16, 22, 22, 0xd8956c);
    r(g, 34, 28, 22, 10, 0xa9694a);
    dither(g, 36, 18, 18, 8, 0xe8b088);
    line(g, 34, 16, 22, 22, 0x6b3f2c);
    r(g, 24, 25, 42, 2, 0xe9e2d4);
    r(g, 22, 27, 46, 1, 0xa9a3b8);
    r(g, 68, 40, 6, 6, 0xc9c4d8);
    r(g, 68, 43, 6, 3, 0x8d88a0);
    typeLine(g, 28, 48, 34, 0x6f6a86);
  }));

  // abstract: overlapping geometry, stepped arc, dithered field
  make(scene, "poster-abstract-zoom", 90, 55, zoom(0xece4d6, (g) => {
    r(g, 10, 10, 26, 34, 0x3f6f7a);
    r(g, 24, 20, 30, 24, 0xd97b6c);
    dither(g, 26, 22, 26, 20, 0xe89a8c);
    r(g, 46, 8, 18, 18, 0xd8b25c);
    line(g, 46, 8, 18, 18, 0x8a6c2f);
    // stepped quarter arc
    for (let i = 0; i < 9; i++) r(g, 62 + i, 40 - i * 3, 3, 3 + i * 3, 0x2f2b3a);
    r(g, 10, 47, 44, 3, 0x2f2b3a);
    r(g, 16, 16, 8, 8, 0xece4d6);
  }));

  // quote: framed short-line pixel type treatment
  make(scene, "poster-quote-zoom", 90, 55, zoom(0xf2ece0, (g) => {
    line(g, 8, 8, 74, 39, 0x8b847e);
    r(g, 12, 12, 5, 8, ZI);
    r(g, 19, 12, 5, 8, ZI);
    // three short type lines, centered-ish
    r(g, 20, 24, 50, 3, ZI);
    r(g, 26, 30, 38, 3, ZI);
    r(g, 32, 36, 26, 3, 0x6b625c);
    r(g, 60, 41, 14, 2, 0xc8765c);
    r(g, 74, 12, 5, 8, ZM);
  }));
};



