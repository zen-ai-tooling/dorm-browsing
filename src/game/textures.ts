import * as Phaser from "phaser";

type G = Phaser.GameObjects.Graphics;

const make = (scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) => {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
};

/* ---------------------------------------------------------------
 * Shared art language for every sprite in the dorm:
 *  - one outline colour + one stroke weight
 *  - rounded corners everywhere (radius >= 3)
 *  - a soft contact shadow ellipse under every free-standing prop
 *  - one warm highlight pass on top faces, one cool shade pass below
 * ------------------------------------------------------------- */
const INK = 0x4a3f52; // single outline colour
const STROKE = 2; // single stroke weight
const INK_A = 0.55; // single outline alpha

/** soft contact shadow so props sit ON the floor */
const shadow = (g: G, cx: number, cy: number, w: number, h = Math.max(6, w * 0.16)) => {
  g.fillStyle(0x2a2030, 0.1);
  g.fillEllipse(cx, cy, w * 1.06, h * 1.25);
  g.fillStyle(0x2a2030, 0.16);
  g.fillEllipse(cx, cy, w, h);
};

/** filled + outlined rounded box (the base shape of every prop) */
const box = (g: G, x: number, y: number, w: number, h: number, r: number, color: number) => {
  g.fillStyle(color, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(STROKE, INK, INK_A);
  g.strokeRoundedRect(x, y, w, h, r);
};

/** top-light highlight band */
const lit = (g: G, x: number, y: number, w: number, h: number, r: number, a = 0.3) => {
  g.fillStyle(0xffffff, a);
  g.fillRoundedRect(x, y, w, h, r);
};

/** lower shade band, gives volume without a gradient */
const shade = (g: G, x: number, y: number, w: number, h: number, r: number, a = 0.14) => {
  g.fillStyle(0x2a2030, a);
  g.fillRoundedRect(x, y, w, h, r);
};

const SKIN = 0xf7d5b5;
const SKIN_SHADE = 0xe7b795;
const HAIR = 0x4a3550;
const HAIR_LIT = 0x63466b;
const SHIRT = 0x74c6d8;
const SHIRT_SHADE = 0x53a8bd;
const PANTS = 0x5d6b8a;
const SHOE = 0x3d4763;

/**
 * Chibi character, 32x42.
 * Big soft head (~55% of height), rounded silhouette, visible face,
 * two-tone cel shading and a grounded contact shadow.
 */
const drawChar = (g: G, dir: string, step: number) => {
  const bob = step === 1 ? -1 : step === 2 ? 0 : 0;
  const swing = step === 0 ? 0 : step === 1 ? 3 : -3;
  const cx = 16;
  const headY = 15 + bob;
  const HR = 11; // head radius — deliberately large vs. the body

  // grounding shadow (squashes slightly on the up-step)
  shadow(g, cx, 39.5, step === 1 ? 17 : 19, 5.5);

  // legs
  g.fillStyle(PANTS, 1);
  g.fillRoundedRect(cx - 7 + swing, 32 + bob, 6.5, 8, 3.2);
  g.fillRoundedRect(cx + 0.5 - swing, 32 + bob, 6.5, 8, 3.2);
  g.fillStyle(SHOE, 1);
  g.fillRoundedRect(cx - 7.5 + swing, 36 + bob, 7.5, 4.5, 2.2);
  g.fillRoundedRect(cx + 0 - swing, 36 + bob, 7.5, 4.5, 2.2);

  // torso — rounded pill, no straight silhouette
  g.fillStyle(SHIRT, 1);
  g.fillRoundedRect(cx - 8, 24 + bob, 16, 12, 6);
  g.fillStyle(SHIRT_SHADE, 1);
  g.fillRoundedRect(cx - 8, 30 + bob, 16, 6, 5); // cel shade, lower half
  g.fillStyle(SHIRT, 1);
  g.fillRoundedRect(cx - 8, 24 + bob, 16, 8, 6);
  lit(g, cx - 6, 25 + bob, 12, 3.5, 2, 0.28);
  g.lineStyle(STROKE - 0.5, INK, 0.45);
  g.strokeRoundedRect(cx - 8, 24 + bob, 16, 12, 6);

  // arms (little rounded mitts, swing with the step)
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx - 9.5, 30 + bob + (step === 1 ? -1.5 : 1), 3.2);
  g.fillCircle(cx + 9.5, 30 + bob + (step === 1 ? 1 : -1.5), 3.2);

  // head: skin base, cel shade at the jaw, then hair on top
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx, headY, HR);
  g.fillStyle(SKIN_SHADE, 0.9);
  g.fillEllipse(cx, headY + 6.5, HR * 1.7, HR * 0.85);
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx, headY - 1.2, HR - 0.4);
  g.lineStyle(STROKE - 0.4, INK, 0.42);
  g.strokeCircle(cx, headY, HR);

  // hair
  g.fillStyle(HAIR, 1);
  if (dir === "up") {
    g.fillCircle(cx, headY - 0.5, HR + 0.4);
    g.fillStyle(HAIR_LIT, 0.7);
    g.fillEllipse(cx, headY - 6, 14, 6);
  } else {
    g.fillEllipse(cx, headY - 6.5, HR * 2.05, 13);
    g.fillStyle(HAIR, 1);
    if (dir === "left") g.fillEllipse(cx - 8.5, headY, 6.5, 15);
    if (dir === "right") g.fillEllipse(cx + 8.5, headY, 6.5, 15);
    if (dir === "down") {
      g.fillEllipse(cx - 9.5, headY + 1, 5.5, 14);
      g.fillEllipse(cx + 9.5, headY + 1, 5.5, 14);
    }
    g.fillStyle(HAIR_LIT, 0.75);
    g.fillEllipse(cx - 2, headY - 8.5, 10, 4.5);
  }

  // face
  if (dir !== "up") {
    const off = dir === "left" ? -3.2 : dir === "right" ? 3.2 : 0;
    const ey = headY + 1.5;
    g.fillStyle(0x3b3140, 1);
    if (dir === "down") {
      g.fillEllipse(cx - 4, ey, 3.4, 4.2);
      g.fillEllipse(cx + 4, ey, 3.4, 4.2);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(cx - 4.8, ey - 1.1, 0.9);
      g.fillCircle(cx + 3.2, ey - 1.1, 0.9);
    } else {
      g.fillEllipse(cx + off - 1.6, ey, 3.2, 4.2);
      g.fillEllipse(cx + off + 3, ey, 3.2, 4.2);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(cx + off - 2.2, ey - 1.1, 0.9);
      g.fillCircle(cx + off + 2.4, ey - 1.1, 0.9);
    }
    // blush
    g.fillStyle(0xf29a9a, 0.5);
    g.fillEllipse(cx - 7 + off, ey + 4, 5, 3);
    g.fillEllipse(cx + 7 + off, ey + 4, 5, 3);
    // smile
    g.lineStyle(1.5, 0x8c6a70, 0.95);
    g.beginPath();
    g.arc(cx + off, ey + 3.4, 2.8, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
    g.strokePath();
  }
};

export const buildTextures = (scene: Phaser.Scene) => {
  for (const dir of ["down", "up", "left", "right"]) {
    for (const step of [0, 1, 2]) {
      make(scene, `char-${dir}-${step}`, 32, 42, (g) => drawChar(g, dir, step));
    }
  }

  // soft radial glow
  make(scene, "glow", 128, 128, (g) => {
    for (let i = 16; i > 0; i--) {
      g.fillStyle(0xffffff, 0.05);
      g.fillCircle(64, 64, (i / 16) * 62);
    }
  });

  make(scene, "note", 22, 26, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(8, 19, 11, 9);
    g.fillRoundedRect(12, 4, 3, 15, 1.5);
    g.fillRoundedRect(12, 4, 9, 4.5, 2);
  });

  make(scene, "sparkle", 16, 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 3.2);
  });

  /* ---------------- props: one consistent asset set ---------------- */

  make(scene, "speaker", 44, 62, (g) => {
    shadow(g, 22, 57, 32);
    box(g, 6, 6, 32, 50, 8, 0x6d5e68);
    shade(g, 6, 36, 32, 20, 8, 0.16);
    lit(g, 10, 9, 24, 5, 3);
    // woofer + tweeter, same rounding language
    g.fillStyle(0xf7f0e8, 1);
    g.fillCircle(22, 22, 9.5);
    g.lineStyle(STROKE, INK, INK_A);
    g.strokeCircle(22, 22, 9.5);
    g.fillStyle(0xb8a6af, 1);
    g.fillCircle(22, 22, 4.5);
    g.fillStyle(0xf7f0e8, 1);
    g.fillCircle(22, 42, 6.5);
    g.lineStyle(STROKE, INK, INK_A);
    g.strokeCircle(22, 42, 6.5);
    g.fillStyle(0xb8a6af, 1);
    g.fillCircle(22, 42, 2.8);
  });

  // corkboard with pinned notes
  make(scene, "board", 68, 54, (g) => {
    shadow(g, 34, 50, 46, 7);
    box(g, 2, 2, 64, 44, 6, 0x9d7a52);
    g.fillStyle(0xd9b98a, 1);
    g.fillRoundedRect(7, 7, 54, 34, 4);
    // cork speckle
    g.fillStyle(0xc0a072, 0.5);
    for (let i = 0; i < 22; i++)
      g.fillCircle(10 + ((i * 37) % 48), 10 + ((i * 23) % 28), 1.1);
    const notes: Array<[number, number, number, number, number]> = [
      [10, 10, 17, 13, 0xfffdf7],
      [31, 12, 20, 11, 0xfdf0c8],
      [14, 26, 21, 12, 0xfde9e2],
      [40, 25, 17, 13, 0xe6f1f6],
    ];
    for (const [x, y, w, h, c] of notes) {
      g.fillStyle(c, 1);
      g.fillRoundedRect(x, y, w, h, 2);
      g.lineStyle(1.2, INK, 0.3);
      g.strokeRoundedRect(x, y, w, h, 2);
      g.fillStyle(INK, 0.25);
      g.fillRect(x + 3, y + 4, w - 7, 1.2);
      g.fillRect(x + 3, y + 7, w - 10, 1.2);
      g.fillStyle(0xe98d70, 1); // pin
      g.fillCircle(x + w / 2, y + 1.5, 1.9);
    }
    lit(g, 6, 4, 56, 3, 2, 0.25);
  });

  make(scene, "plant", 44, 58, (g) => {
    shadow(g, 22, 53, 28);
    g.fillStyle(0x8ec98a, 1);
    g.fillEllipse(22, 24, 17, 26);
    g.fillEllipse(11, 30, 13, 19);
    g.fillEllipse(33, 30, 13, 19);
    g.fillStyle(0xacdda6, 0.85);
    g.fillEllipse(20, 19, 9, 15);
    g.lineStyle(STROKE - 0.5, INK, 0.35);
    g.strokeEllipse(22, 24, 17, 26);
    box(g, 10, 34, 24, 18, 6, 0xe4a68b);
    shade(g, 10, 44, 24, 8, 6, 0.15);
    lit(g, 13, 36, 18, 4, 2);
  });

  make(scene, "pet", 48, 44, (g) => {
    shadow(g, 24, 40, 30);
    g.fillStyle(0xf0a868, 1);
    g.fillEllipse(26, 27, 30, 19);
    g.fillStyle(0xd98c50, 0.55);
    g.fillEllipse(26, 32, 26, 9);
    g.fillStyle(0xf0a868, 1);
    g.fillCircle(15, 19, 10.5);
    g.fillTriangle(6, 13, 11, 2, 17, 12);
    g.fillTriangle(15, 12, 21, 2, 25, 13);
    g.lineStyle(STROKE - 0.6, INK, 0.35);
    g.strokeCircle(15, 19, 10.5);
    g.fillStyle(0x3b3140, 1);
    g.fillEllipse(11.5, 19, 3, 3.8);
    g.fillEllipse(18.5, 19, 3, 3.8);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(10.8, 18.2, 0.8);
    g.fillCircle(17.8, 18.2, 0.8);
    g.fillStyle(0xf7cba7, 1);
    g.fillCircle(15, 23, 2.6);
  });

  // proper little bed: frame, pillow, folded blanket
  make(scene, "bed", 96, 72, (g) => {
    shadow(g, 48, 67, 76, 9);
    box(g, 2, 4, 92, 60, 9, 0xb98b62);
    lit(g, 6, 7, 84, 4, 2, 0.25);
    // mattress
    g.fillStyle(0xfdf6ec, 1);
    g.fillRoundedRect(7, 9, 82, 50, 7);
    g.lineStyle(1.4, INK, 0.28);
    g.strokeRoundedRect(7, 9, 82, 50, 7);
    // pillow
    g.fillStyle(0xfffdf8, 1);
    g.fillRoundedRect(11, 14, 26, 40, 8);
    g.lineStyle(1.4, INK, 0.3);
    g.strokeRoundedRect(11, 14, 26, 40, 8);
    g.fillStyle(0x2a2030, 0.07);
    g.fillRoundedRect(14, 20, 20, 28, 7);
    // blanket + fold
    g.fillStyle(0xa8cfe0, 1);
    g.fillRoundedRect(40, 12, 46, 44, 7);
    g.lineStyle(1.4, INK, 0.3);
    g.strokeRoundedRect(40, 12, 46, 44, 7);
    g.fillStyle(0xc9e6f2, 1);
    g.fillRoundedRect(40, 12, 46, 12, 6);
    g.fillStyle(0x82b2c8, 0.5);
    g.fillRoundedRect(40, 24, 46, 3, 1.5);
    g.fillRoundedRect(40, 40, 46, 3, 1.5);
  });

  make(scene, "desk", 92, 56, (g) => {
    shadow(g, 46, 51, 74, 8);
    box(g, 2, 12, 88, 34, 7, 0xc59b6d);
    lit(g, 6, 15, 80, 5, 3);
    shade(g, 2, 36, 88, 10, 7, 0.13);
    // monitor
    box(g, 24, 0, 36, 18, 4, 0xf4f7f8);
    g.fillStyle(0x8fb8c9, 1);
    g.fillRoundedRect(27, 3, 30, 12, 3);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(29, 5, 12, 4, 2);
    // mug
    box(g, 68, 20, 12, 12, 4, 0xe98d70);
  });

  make(scene, "couch", 116, 66, (g) => {
    shadow(g, 58, 61, 96, 10);
    box(g, 2, 6, 112, 46, 14, 0x8fbfc4);
    lit(g, 8, 9, 100, 5, 3);
    // cushions
    for (const cxp of [12, 62]) {
      g.fillStyle(0xb6dde0, 1);
      g.fillRoundedRect(cxp, 18, 42, 28, 10);
      g.lineStyle(1.4, INK, 0.3);
      g.strokeRoundedRect(cxp, 18, 42, 28, 10);
    }
    shade(g, 2, 42, 112, 10, 12, 0.12);
  });

  make(scene, "table", 76, 50, (g) => {
    shadow(g, 38, 45, 60, 8);
    box(g, 3, 8, 70, 30, 12, 0xd9b489);
    lit(g, 11, 11, 54, 5, 3);
    shade(g, 3, 30, 70, 8, 11, 0.12);
    box(g, 30, 14, 18, 12, 4, 0xfdf0c8); // book on top
  });

  make(scene, "tv", 92, 66, (g) => {
    shadow(g, 46, 61, 70, 8);
    box(g, 2, 2, 88, 46, 8, 0x6d6470);
    g.fillStyle(0xa9d8e8, 1);
    g.fillRoundedRect(8, 8, 76, 32, 5);
    g.lineStyle(1.4, INK, 0.3);
    g.strokeRoundedRect(8, 8, 76, 32, 5);
    g.fillStyle(0xdaf1f8, 0.75);
    g.fillRoundedRect(14, 13, 30, 11, 3);
    box(g, 36, 46, 20, 8, 3, 0x574f5c); // stand
  });

  make(scene, "shelf", 76, 70, (g) => {
    shadow(g, 38, 65, 60, 8);
    box(g, 2, 2, 72, 60, 6, 0xb98b62);
    g.fillStyle(0x8f6a4a, 1);
    g.fillRoundedRect(6, 28, 64, 4, 2);
    for (let i = 0; i < 5; i++) {
      const c = [0xe98d70, 0x8fbfc4, 0xb98ee0, 0xf2c66d, 0x8ec98a][i]!;
      g.fillStyle(c, 1);
      g.fillRoundedRect(9 + i * 12, 8, 9, 19, 2.5);
      g.fillRoundedRect(11 + i * 12, 34, 8, 22, 2.5);
      g.lineStyle(1.2, INK, 0.28);
      g.strokeRoundedRect(9 + i * 12, 8, 9, 19, 2.5);
      g.strokeRoundedRect(11 + i * 12, 34, 8, 22, 2.5);
    }
    lit(g, 6, 4, 64, 3, 2, 0.22);
  });

  make(scene, "fridge", 60, 94, (g) => {
    shadow(g, 30, 89, 44, 7);
    box(g, 2, 2, 56, 84, 8, 0xf1f4f5);
    lit(g, 6, 5, 48, 5, 3, 0.5);
    shade(g, 2, 62, 56, 24, 8, 0.1);
    g.fillStyle(0xdbe4e7, 1);
    g.fillRoundedRect(6, 34, 48, 3, 1.5);
    g.fillStyle(0xb9c6cb, 1);
    g.fillRoundedRect(46, 12, 5, 16, 2.5);
    g.fillRoundedRect(46, 44, 5, 16, 2.5);
    box(g, 12, 46, 15, 11, 3, 0xf2c66d); // magnet note
  });

  make(scene, "counter", 108, 56, (g) => {
    shadow(g, 54, 51, 86, 8);
    box(g, 2, 4, 104, 44, 7, 0xe8d3b6);
    lit(g, 6, 7, 96, 5, 3, 0.45);
    shade(g, 2, 36, 104, 12, 7, 0.11);
    g.fillStyle(0xd3b78f, 1);
    g.fillRoundedRect(52, 18, 3, 26, 1.5);
    box(g, 14, 14, 18, 14, 4, 0x8fbfc4); // sink
  });

  make(scene, "vending", 64, 98, (g) => {
    shadow(g, 32, 93, 46, 7);
    box(g, 2, 2, 60, 88, 8, 0xe98d70);
    lit(g, 6, 5, 52, 5, 3, 0.3);
    g.fillStyle(0x33404d, 1);
    g.fillRoundedRect(8, 10, 34, 58, 5);
    g.lineStyle(1.4, INK, 0.3);
    g.strokeRoundedRect(8, 10, 34, 58, 5);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        g.fillStyle([0xf2c66d, 0x8fbfc4, 0xb98ee0][(r + c) % 3]!, 1);
        g.fillRoundedRect(12 + c * 10, 14 + r * 18, 8, 13, 2.5);
      }
    box(g, 46, 14, 11, 26, 3, 0xfdf3e6);
    box(g, 46, 48, 11, 22, 3, 0x4b3a52);
    shade(g, 2, 74, 60, 16, 8, 0.12);
  });

  make(scene, "crate", 60, 52, (g) => {
    shadow(g, 30, 47, 46, 7);
    box(g, 2, 10, 56, 34, 6, 0xcfa574);
    box(g, 5, 4, 50, 14, 5, 0xe4c39a);
    lit(g, 9, 6, 42, 4, 2);
    box(g, 14, 22, 15, 9, 3, 0x8fbfc4);
    box(g, 33, 24, 13, 11, 3, 0xe98d70);
  });

  make(scene, "bench", 88, 48, (g) => {
    shadow(g, 44, 43, 70, 8);
    box(g, 3, 16, 82, 16, 6, 0xc99a68);
    box(g, 3, 4, 82, 9, 4, 0xd6a875);
    lit(g, 8, 6, 72, 3, 2);
    g.fillStyle(0x8f6a4a, 1);
    g.fillRoundedRect(10, 32, 6, 8, 2);
    g.fillRoundedRect(72, 32, 6, 8, 2);
  });

  make(scene, "tree", 112, 124, (g) => {
    shadow(g, 56, 116, 64, 12);
    box(g, 48, 62, 16, 50, 6, 0xb08055);
    g.fillStyle(0x77bd80, 1);
    g.fillCircle(56, 46, 36);
    g.fillCircle(28, 60, 22);
    g.fillCircle(84, 60, 22);
    g.lineStyle(STROKE, INK, 0.3);
    g.strokeCircle(56, 46, 36);
    g.fillStyle(0x97d69c, 0.9);
    g.fillCircle(46, 34, 18);
    g.fillStyle(0x4f9a63, 0.28);
    g.fillEllipse(56, 72, 58, 18);
  });

  make(scene, "record", 56, 50, (g) => {
    shadow(g, 28, 45, 44, 7);
    box(g, 2, 6, 52, 36, 6, 0x8f7d86);
    g.fillStyle(0x3b3140, 1);
    g.fillCircle(24, 24, 13);
    g.lineStyle(1.2, 0xffffff, 0.25);
    g.strokeCircle(24, 24, 9);
    g.fillStyle(0xf2c66d, 1);
    g.fillCircle(24, 24, 4);
    box(g, 40, 12, 10, 10, 3, 0xe98d70);
  });

  make(scene, "rug", 160, 104, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(80, 52, 156, 100);
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(80, 52, 120, 74);
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(80, 52, 74, 44);
  });

  make(scene, "lockdoor", 68, 94, (g) => {
    shadow(g, 34, 89, 48, 7);
    box(g, 2, 2, 64, 86, 8, 0x6f6a74);
    g.fillStyle(0x565161, 1);
    g.fillRoundedRect(8, 8, 52, 74, 6);
    lit(g, 12, 10, 44, 4, 2, 0.18);
    g.fillStyle(0xbdb6c4, 1);
    g.fillRoundedRect(28, 40, 12, 14, 3);
    g.fillCircle(34, 40, 6);
    g.fillStyle(0x565161, 1);
    g.fillCircle(34, 40, 3);
  });

  // sticker icons (single shared set, tinted at use site)
  const stickers: Record<string, (g: G) => void> = {
    "music-note": (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 17, 5);
      g.fillRoundedRect(12, 4, 2.6, 14, 1.3);
    },
    skateboard: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(2, 8, 20, 6, 3);
      g.fillCircle(7, 17, 3);
      g.fillCircle(17, 17, 3);
    },
    book: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(3, 4, 18, 16, 3);
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(11.5, 4, 1.5, 16, 0.7);
    },
    pottery: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(12, 14, 16, 12);
      g.fillRoundedRect(6, 4, 12, 5, 2);
    },
    vinyl: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(12, 12, 10);
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(12, 12, 3);
    },
    sneaker: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(3, 10, 18, 8, 3);
      g.fillRoundedRect(3, 5, 9, 8, 3);
    },
  };
  for (const [k, d] of Object.entries(stickers)) make(scene, `sticker-${k}`, 24, 24, d);
};
