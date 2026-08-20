import * as Phaser from "phaser";

type G = Phaser.GameObjects.Graphics;

const make = (scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) => {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
};

const SKIN = 0xf6d3b6;
const HAIR = 0x4b3a52;
const SHIRT = 0x7cc7d6;
const PANTS = 0x5d6b8a;
const SHOE = 0x3f4a63;
const OUTLINE = 0x584a5e;

/** Soft chibi character, 28x36. dir: down | up | left | right, step: 0 idle, 1/2 walk */
const drawChar = (g: G, dir: string, step: number) => {
  const bob = step === 1 ? -1 : step === 2 ? 1 : 0;
  const legSpread = step === 0 ? 0 : step === 1 ? 3 : -3;
  const cx = 14;
  const top = 4 + bob;

  // shadow
  g.fillStyle(0x000000, 0.14);
  g.fillEllipse(cx, 34, 18, 6);

  // legs
  g.fillStyle(PANTS, 1);
  g.fillRoundedRect(cx - 7 + legSpread, 24, 6, 8, 3);
  g.fillRoundedRect(cx + 1 - legSpread, 24, 6, 8, 3);
  g.fillStyle(SHOE, 1);
  g.fillRoundedRect(cx - 7 + legSpread, 29, 6, 4, 2);
  g.fillRoundedRect(cx + 1 - legSpread, 29, 6, 4, 2);

  // body
  g.fillStyle(SHIRT, 1);
  g.fillRoundedRect(cx - 8, top + 12, 16, 14, 6);
  g.lineStyle(1.5, OUTLINE, 0.5);
  g.strokeRoundedRect(cx - 8, top + 12, 16, 14, 6);

  // arms
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx - 9, top + 20 + (step === 1 ? -1 : 1), 3);
  g.fillCircle(cx + 9, top + 20 + (step === 1 ? 1 : -1), 3);

  // head
  g.fillStyle(SKIN, 1);
  g.fillCircle(cx, top + 8, 9);
  g.lineStyle(1.5, OUTLINE, 0.45);
  g.strokeCircle(cx, top + 8, 9);

  // hair
  g.fillStyle(HAIR, 1);
  if (dir === "up") {
    g.fillCircle(cx, top + 7, 9.2);
  } else {
    g.fillEllipse(cx, top + 3, 19, 12);
    if (dir === "left") g.fillEllipse(cx - 7, top + 8, 6, 12);
    if (dir === "right") g.fillEllipse(cx + 7, top + 8, 6, 12);
    if (dir === "down") {
      g.fillEllipse(cx - 8, top + 9, 5, 12);
      g.fillEllipse(cx + 8, top + 9, 5, 12);
    }
  }

  // face
  if (dir !== "up") {
    const off = dir === "left" ? -3 : dir === "right" ? 3 : 0;
    g.fillStyle(0x3b3140, 1);
    if (dir === "down") {
      g.fillCircle(cx - 3.4, top + 9, 1.7);
      g.fillCircle(cx + 3.4, top + 9, 1.7);
    } else {
      g.fillCircle(cx + off - 1.5, top + 9, 1.7);
      g.fillCircle(cx + off + 2.5, top + 9, 1.7);
    }
    g.fillStyle(0xf2a3a3, 0.55);
    g.fillCircle(cx - 6 + off, top + 12, 2.2);
    g.fillCircle(cx + 6 + off, top + 12, 2.2);
    g.lineStyle(1.4, 0x8c6a70, 0.9);
    g.beginPath();
    g.arc(cx + off, top + 11.5, 2.6, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
  }
};

export const buildTextures = (scene: Phaser.Scene) => {
  for (const dir of ["down", "up", "left", "right"]) {
    for (const step of [0, 1, 2]) {
      make(scene, `char-${dir}-${step}`, 28, 36, (g) => drawChar(g, dir, step));
    }
  }

  // soft radial glow
  make(scene, "glow", 128, 128, (g) => {
    for (let i = 16; i > 0; i--) {
      g.fillStyle(0xffffff, 0.05);
      g.fillCircle(64, 64, (i / 16) * 62);
    }
  });

  make(scene, "note", 20, 24, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(7, 17, 5);
    g.fillRect(11, 3, 2.6, 15);
    g.fillRoundedRect(11, 3, 8, 4, 2);
  });

  make(scene, "sparkle", 16, 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 3.2);
  });

  // ---- props (all flat-vector, soft rounded) ----
  make(scene, "speaker", 40, 56, (g) => {
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(20, 52, 32, 8);
    g.fillStyle(0x6a5b63, 1);
    g.fillRoundedRect(4, 4, 32, 46, 8);
    g.fillStyle(0xf6efe7, 1);
    g.fillCircle(20, 18, 9);
    g.fillCircle(20, 38, 6);
    g.fillStyle(0xb7a5ae, 1);
    g.fillCircle(20, 18, 4);
    g.fillCircle(20, 38, 2.6);
  });

  make(scene, "board", 64, 48, (g) => {
    g.fillStyle(0x9d7a52, 1);
    g.fillRoundedRect(0, 0, 64, 48, 6);
    g.fillStyle(0xd8b98a, 1);
    g.fillRoundedRect(4, 4, 56, 40, 4);
    g.fillStyle(0xfffdf7, 1);
    g.fillRoundedRect(9, 9, 18, 14, 2);
    g.fillRoundedRect(32, 12, 22, 10, 2);
    g.fillRoundedRect(14, 27, 24, 12, 2);
    g.fillStyle(0xe98d70, 1);
    g.fillCircle(45, 32, 3);
  });

  make(scene, "plant", 40, 52, (g) => {
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(20, 48, 28, 7);
    g.fillStyle(0xe4a68b, 1);
    g.fillRoundedRect(9, 30, 22, 18, 6);
    g.fillStyle(0x8ec98a, 1);
    g.fillEllipse(20, 22, 16, 24);
    g.fillEllipse(10, 28, 12, 18);
    g.fillEllipse(30, 28, 12, 18);
    g.fillStyle(0xa9dda3, 0.8);
    g.fillEllipse(20, 18, 8, 14);
  });

  make(scene, "pet", 44, 40, (g) => {
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(22, 37, 30, 7);
    g.fillStyle(0xf0a868, 1);
    g.fillEllipse(24, 26, 30, 18);
    g.fillCircle(14, 18, 10);
    g.fillTriangle(6, 12, 10, 2, 16, 11);
    g.fillTriangle(14, 11, 20, 2, 24, 12);
    g.fillStyle(0x3b3140, 1);
    g.fillCircle(11, 18, 1.7);
    g.fillCircle(18, 18, 1.7);
    g.fillStyle(0xf6c9a5, 1);
    g.fillCircle(14.5, 21.5, 2.4);
  });

  make(scene, "bed", 96, 64, (g) => {
    g.fillStyle(0xb98b62, 1);
    g.fillRoundedRect(0, 0, 96, 64, 8);
    g.fillStyle(0xfdf6ec, 1);
    g.fillRoundedRect(6, 6, 30, 52, 6);
    g.fillStyle(0xa8cfe0, 1);
    g.fillRoundedRect(34, 6, 56, 52, 6);
    g.fillStyle(0xc9e4ef, 1);
    g.fillRoundedRect(40, 12, 44, 18, 6);
  });

  make(scene, "desk", 88, 48, (g) => {
    g.fillStyle(0xc59b6d, 1);
    g.fillRoundedRect(0, 8, 88, 34, 6);
    g.fillStyle(0xdcb888, 1);
    g.fillRoundedRect(4, 12, 80, 12, 4);
    g.fillStyle(0xf4f7f8, 1);
    g.fillRoundedRect(20, 0, 34, 16, 3);
    g.fillStyle(0x8fb8c9, 1);
    g.fillRoundedRect(23, 2, 28, 11, 2);
  });

  make(scene, "couch", 112, 56, (g) => {
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(56, 52, 96, 10);
    g.fillStyle(0x8fbfc4, 1);
    g.fillRoundedRect(0, 4, 112, 42, 14);
    g.fillStyle(0xb6dde0, 1);
    g.fillRoundedRect(10, 16, 40, 26, 10);
    g.fillRoundedRect(60, 16, 40, 26, 10);
  });

  make(scene, "table", 72, 44, (g) => {
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(36, 40, 60, 8);
    g.fillStyle(0xd9b489, 1);
    g.fillRoundedRect(2, 6, 68, 28, 12);
    g.fillStyle(0xefd6b6, 1);
    g.fillRoundedRect(10, 12, 52, 14, 8);
  });

  make(scene, "tv", 88, 56, (g) => {
    g.fillStyle(0x6d6470, 1);
    g.fillRoundedRect(0, 0, 88, 50, 8);
    g.fillStyle(0xa9d8e8, 1);
    g.fillRoundedRect(6, 6, 76, 34, 5);
    g.fillStyle(0xd9f0f7, 0.7);
    g.fillRoundedRect(12, 11, 30, 12, 3);
  });

  make(scene, "shelf", 72, 60, (g) => {
    g.fillStyle(0xb98b62, 1);
    g.fillRoundedRect(0, 0, 72, 60, 6);
    g.fillStyle(0x8f6a4a, 1);
    g.fillRect(4, 26, 64, 4);
    for (let i = 0; i < 5; i++) {
      g.fillStyle([0xe98d70, 0x8fbfc4, 0xb98ee0, 0xf2c66d, 0x8ec98a][i]!, 1);
      g.fillRoundedRect(7 + i * 12, 6, 9, 19, 2);
      g.fillRoundedRect(9 + i * 12, 33, 8, 22, 2);
    }
  });

  make(scene, "fridge", 56, 84, (g) => {
    g.fillStyle(0xf1f4f5, 1);
    g.fillRoundedRect(0, 0, 56, 84, 8);
    g.fillStyle(0xdbe4e7, 1);
    g.fillRect(4, 32, 48, 3);
    g.fillStyle(0xb9c6cb, 1);
    g.fillRoundedRect(44, 10, 5, 16, 2);
    g.fillRoundedRect(44, 42, 5, 16, 2);
    g.fillStyle(0xf2c66d, 1);
    g.fillRoundedRect(10, 44, 14, 10, 2);
  });

  make(scene, "counter", 104, 48, (g) => {
    g.fillStyle(0xe8d3b6, 1);
    g.fillRoundedRect(0, 0, 104, 44, 6);
    g.fillStyle(0xf6ead6, 1);
    g.fillRoundedRect(4, 2, 96, 12, 4);
    g.fillStyle(0xd3b78f, 1);
    g.fillRect(50, 16, 3, 26);
  });

  make(scene, "vending", 60, 92, (g) => {
    g.fillStyle(0xe98d70, 1);
    g.fillRoundedRect(0, 0, 60, 92, 8);
    g.fillStyle(0x33404d, 1);
    g.fillRoundedRect(6, 8, 34, 60, 5);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        g.fillStyle([0xf2c66d, 0x8fbfc4, 0xb98ee0][(r + c) % 3]!, 1);
        g.fillRoundedRect(10 + c * 10, 12 + r * 18, 8, 13, 2);
      }
    g.fillStyle(0xfdf3e6, 1);
    g.fillRoundedRect(44, 12, 10, 26, 3);
    g.fillStyle(0x4b3a52, 1);
    g.fillRoundedRect(44, 46, 10, 22, 3);
  });

  make(scene, "crate", 56, 44, (g) => {
    g.fillStyle(0xcfa574, 1);
    g.fillRoundedRect(0, 4, 56, 38, 6);
    g.fillStyle(0xe4c39a, 1);
    g.fillRoundedRect(3, 0, 50, 14, 5);
    g.fillStyle(0x8fbfc4, 1);
    g.fillRoundedRect(12, 18, 14, 8, 3);
    g.fillStyle(0xe98d70, 1);
    g.fillRoundedRect(30, 20, 12, 10, 3);
  });

  make(scene, "bench", 84, 40, (g) => {
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(42, 36, 70, 8);
    g.fillStyle(0xc99a68, 1);
    g.fillRoundedRect(2, 12, 80, 16, 6);
    g.fillRoundedRect(2, 2, 80, 8, 4);
  });

  make(scene, "tree", 108, 116, (g) => {
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(54, 110, 62, 12);
    g.fillStyle(0xb08055, 1);
    g.fillRoundedRect(46, 60, 16, 48, 6);
    g.fillStyle(0x77bd80, 1);
    g.fillCircle(54, 44, 36);
    g.fillCircle(26, 58, 22);
    g.fillCircle(82, 58, 22);
    g.fillStyle(0x94d49a, 0.85);
    g.fillCircle(44, 34, 18);
  });

  make(scene, "record", 52, 44, (g) => {
    g.fillStyle(0x8f7d86, 1);
    g.fillRoundedRect(0, 4, 52, 36, 6);
    g.fillStyle(0x3b3140, 1);
    g.fillCircle(22, 22, 13);
    g.fillStyle(0xf2c66d, 1);
    g.fillCircle(22, 22, 4);
  });

  make(scene, "lockdoor", 64, 88, (g) => {
    g.fillStyle(0x6f6a74, 1);
    g.fillRoundedRect(0, 0, 64, 88, 8);
    g.fillStyle(0x565161, 1);
    g.fillRoundedRect(6, 6, 52, 76, 6);
    g.fillStyle(0xbdb6c4, 1);
    g.fillRoundedRect(26, 36, 12, 14, 3);
    g.fillCircle(32, 36, 6);
    g.fillStyle(0x565161, 1);
    g.fillCircle(32, 36, 3);
  });

  // sticker icons (single shared sheet-ish set, tinted white base)
  const stickers: Record<string, (g: G) => void> = {
    "music-note": (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 17, 5);
      g.fillRect(12, 4, 2.5, 14);
    },
    skateboard: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(2, 8, 20, 6, 3);
      g.fillCircle(7, 17, 3);
      g.fillCircle(17, 17, 3);
    },
    book: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(3, 4, 18, 16, 2);
      g.fillStyle(0x000000, 0.25);
      g.fillRect(11.5, 4, 1.5, 16);
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
