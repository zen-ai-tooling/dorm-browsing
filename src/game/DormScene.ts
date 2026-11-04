import * as Phaser from "phaser";
import { sfx, unlockAudio } from "./sounds";
import {
  COMMUNITY_CORKBOARD,
  FLAVOR_PROPS,
  MOODS,
  ROOMS,
  type PersonRoom,
  type PlacedItem,
  type PopupPayload,
} from "@/data/dorm";
import {
  ITEM_CATALOG,
  displayTintFor,
  effectiveFootprint,
  isWallItem,
  zoomTextureKey,
  type ItemDef,
  type Rotation,
} from "@/data/items";
import { buildTextures } from "./textures";
import { canPlaceIn, WINDOW_COLS } from "@/data/placement";
import { Lighting, type Light, type LightSpec } from "./lighting";
import {
  DARKNESS_ALPHA,
  DARKNESS_COLOR,
  PHASE_FADE_MS,
  PHASE_LOOK,
  PHASES,
  phaseFor,
  type Phase,
} from "./timeOfDay";

export const TILE = 32;
const GRID_W = 88;
const GRID_H = 40;

const VOID = 0;
const FLOOR = 1;
const WALL = 2;
const BLOCKED = 3;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Zone extends Rect {
  id: string;
  label: string;
  floor: number;
  wall: number;
  kind: "hall" | "personal" | "common" | "outdoor";
  floorStyle?: "planks" | "linoleum";
}

const mix = (a: number, b: number, t: number) =>
  Phaser.Display.Color.ObjectToColor(
    Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(a),
      Phaser.Display.Color.IntegerToColor(b),
      100,
      Math.round(t * 100),
    ),
  ).color;

const NEUTRAL_WALL = 0x8b7461; // muted warm-neutral trim for hallway + common rooms

/** campus ground outside the building (darker than the courtyard lawn) */
const EXT_GROUND = 0x5b7848;
const BRICK = 0x7a4334;
const BRICK_MORTAR = 0x4f2b25;
const BRICK_HI = 0x985a45;
/** stone path rows below the building + the spur up to the courtyard */
const PATH_ROWS = [35, 36];
const PATH_X: [number, number] = [3, 78];
const SPUR_COLS = [76, 77];
const SPUR_ROWS: [number, number] = [29, 34];
const HALL_STRIPE = 0x93a8a2;

interface Look {
  tint: number;
  tintAlpha: number;
  night: number;
  /** per-phase weights (window skies + sunbeams) */
  w: Record<Phase, number>;
}

const lookFor = (p: Phase): Look => ({
  ...PHASE_LOOK[p],
  w: { morning: 0, day: 0, golden: 0, night: 0, [p]: 1 },
});

const lerpColor = (a: number, b: number, k: number) => {
  const ch = (s: number) => {
    const x = (a >> s) & 255;
    const y = (b >> s) & 255;
    return Math.round(x + (y - x) * k) << s;
  };
  return ch(16) | ch(8) | ch(0);
};

const HALL: Zone = {
  id: "hall",
  label: "Hallway",
  x: 2,
  y: 17,
  w: 66,
  h: 5,
  floor: 0xdcd3c3,
  wall: NEUTRAL_WALL,
  kind: "hall",
};

/** tight footprints: sized to their contents, not cavernous */
const PERSONAL_RECTS: Rect[] = [
  { x: 6, y: 7, w: 12, h: 9 },
  { x: 27, y: 7, w: 12, h: 9 },
  { x: 48, y: 7, w: 12, h: 9 },
];

const COMMON: Zone[] = [
  {
    id: "lounge",
    label: "Common Lounge",
    x: 6,
    y: 23,
    w: 16,
    h: 10,
    floor: 0xc9a58a,
    wall: mix(NEUTRAL_WALL, 0xa9704f, 0.35),
    kind: "common",
  },
  {
    id: "study",
    label: "Study Lounge",
    x: 28,
    y: 23,
    w: 14,
    h: 10,
    floor: 0xacb4bd,
    wall: mix(NEUTRAL_WALL, 0x5f7286, 0.35),
    kind: "common",
  },
  {
    id: "kitchen",
    label: "Kitchenette",
    x: 48,
    y: 23,
    w: 12,
    h: 10,
    floor: 0xdcc9a0,
    wall: mix(NEUTRAL_WALL, 0xc9a35e, 0.3),
    floorStyle: "linoleum",
    kind: "common",
  },
  {
    id: "courtyard",
    label: "Courtyard",
    x: 69,
    y: 7,
    w: 16,
    h: 21,
    floor: 0x8fa876,
    wall: mix(NEUTRAL_WALL, 0x5e7a4c, 0.4),
    kind: "outdoor",
  },
];

/** doorway carve-outs: [tileX, tileY] pairs */
const DOORWAYS: Array<[number, number]> = [
  // personal rooms -> hallway (bottom walls at y=16)
  [11, 16],
  [12, 16],
  [32, 16],
  [33, 16],
  [53, 16],
  [54, 16],
  // common rooms -> hallway (top walls at y=22)
  [13, 22],
  [14, 22],
  [34, 22],
  [35, 22],
  [53, 22],
  [54, 22],
  // courtyard <-> hallway (shared wall column x=68)
  [68, 18],
  [68, 19],
];

interface PropDef {
  key: string;
  x: number; // pixels
  y: number;
  scale?: number;
  tint?: number;
  depthBias?: number;
  payload?: PopupPayload;
  label?: string;
  solid?: boolean;
}

const t = (n: number) => n * TILE;


export class DormScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private path: Phaser.Math.Vector2[] = [];
  private stuckMs = 0;
  private facing = "down";
  private walkTime = 0;
  private interactives: Array<{
    sprite: Phaser.GameObjects.Sprite;
    ring: Phaser.GameObjects.Image;
    payload: PopupPayload;
  }> = [];
  private activePayload: PopupPayload | null = null;
  private lastStep = 0;
  private onPopup: (p: PopupPayload | null) => void = () => {};
  private grid: number[][] = [];
  private collecting: Phaser.GameObjects.GameObject[] | null = null;
  private editMode = false;
  private insideMyRoom = false;
  private myObjs: Phaser.GameObjects.GameObject[] = [];
  private placed: Array<{
    sprite: Phaser.GameObjects.Sprite;
    zone: Phaser.GameObjects.Zone | null;
    ring: Phaser.GameObjects.Image | null;
    itemId: string;
    gx: number;
    gy: number;
    rotation: Rotation;
  }> = [];
  private selectedIdx = -1;
  private selectionUi: Phaser.GameObjects.Container | null = null;
  private pendingPlaceItemId: string | null = null;
  private ghost: Phaser.GameObjects.Sprite | null = null;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  private onPlacingChange: (itemId: string | null) => void = () => {};
  private getMyLayout: () => PlacedItem[] = () => ROOMS[0]!.layout;
  private onLayoutChange: (l: PlacedItem[]) => void = () => {};
  private onInsideRoom: (v: boolean) => void = () => {};
  private onReady: (scene: DormScene) => void = () => {};
  private getWallpaperId: () => string = () => ROOMS[0]!.wallpaperId;
  private onWallTap: () => void = () => {};
  private wallGfx: Phaser.GameObjects.Graphics | null = null;
  /** "x,y" keys of back-wall face tiles (2 rows tall) in personal + common rooms + hallway */
  private faceTiles = new Set<string>();
  /** which zone's face each face tile belongs to (painting must not guess via zoneNear) */
  private faceOwner = new Map<string, Zone>();
  /** subtle outline showing where the selected item may go (wall face vs floor) */
  private mountGuide: Phaser.GameObjects.Rectangle | null = null;
  private lighting!: Lighting;
  private getPhase: () => Phase = () => phaseFor(new Date());
  private phase: Phase | null = null;
  private nextPhaseCheck = 0;
  private look: Look = lookFor("day");
  private phaseTween: Phaser.Tweens.Tween | null = null;
  /** per window: one sky image per phase, crossfaded by look.w */
  private skies: Array<Record<Phase, Phaser.GameObjects.Image>> = [];
  private beams: Array<{ g: Phaser.GameObjects.Graphics; phase: Phase }> = [];
  /** placed-item lights, keyed by sprite */
  private placedLights = new Map<Phaser.GameObjects.Sprite, Light>();


  constructor() {
    super("dorm");
  }

  init(data: {
    onPopup?: (p: PopupPayload | null) => void;
    getMyLayout?: () => PlacedItem[];
    onLayoutChange?: (l: PlacedItem[]) => void;
    onInsideRoom?: (v: boolean) => void;
    onPlacingChange?: (itemId: string | null) => void;
    onReady?: (scene: DormScene) => void;
    getWallpaperId?: () => string;
    onWallTap?: () => void;
    getPhase?: () => Phase;
  }) {
    if (data?.getPhase) this.getPhase = data.getPhase;
    if (data?.onPopup) this.onPopup = data.onPopup;
    if (data?.getMyLayout) this.getMyLayout = data.getMyLayout;
    if (data?.onLayoutChange) this.onLayoutChange = data.onLayoutChange;
    if (data?.onInsideRoom) this.onInsideRoom = data.onInsideRoom;
    if (data?.onPlacingChange) this.onPlacingChange = data.onPlacingChange;
    if (data?.onReady) this.onReady = data.onReady;
    if (data?.getWallpaperId) this.getWallpaperId = data.getWallpaperId;
    if (data?.onWallTap) this.onWallTap = data.onWallTap;
  }


  preload() {
    buildTextures(this);
  }

  create() {
    const zones = this.buildZones();
    this.buildGrid(zones);
    this.paintFloor(zones);
    this.buildColliders();
    // lighting exists before decor so every prop can register its light where it's created
    this.lighting = new Lighting(this, GRID_W * TILE, GRID_H * TILE);
    this.decorate(zones);
    this.decorateExterior();
    this.spawnPlayer();
    this.lighting.add({ x: 0, y: 0, follow: this.player, dy: -14, color: 0xffd9a0, radius: 28, cut: false, strength: 0.22 });
    this.setupCamera();
    this.refreshPhase(true);
    this.setupInput();
    this.setupEditorInput();
    this.applyWallpaper();
    this.onReady(this);
  }

  // ---------- world ----------

  /** my room's trim colour, used under equipped wallpaper */
  private myTrim = NEUTRAL_WALL;

  private buildZones(): Zone[] {
    const personal: Zone[] = ROOMS.map((room, i) => {
      const mood = MOODS[room.mood];
      const r = PERSONAL_RECTS[i]!;
      const accent = Phaser.Display.Color.HexStringToColor(room.accentColor).color;
      return {
        ...r,
        id: room.id,
        label: room.name,
        floor: mix(mood.wallpaper, 0xb59774, 0.18),
        // personal rooms get accent-tinted wall trim
        wall: mix(accent, 0x7a6250, 0.22),
        kind: "personal" as const,
      };
    });
    this.myTrim = personal[0]!.wall;
    return [HALL, ...personal, ...COMMON];
  }

  private buildGrid(zones: Zone[]) {
    this.grid = Array.from({ length: GRID_H }, () => Array.from({ length: GRID_W }, () => VOID));
    for (const z of zones)
      for (let y = z.y; y < z.y + z.h; y++)
        for (let x = z.x; x < z.x + z.w; x++) this.grid[y]![x] = FLOOR;
    // wall ring
    for (const z of zones)
      for (let y = z.y - 1; y <= z.y + z.h; y++)
        for (let x = z.x - 1; x <= z.x + z.w; x++) {
          if (y < 0 || x < 0 || y >= GRID_H || x >= GRID_W) continue;
          if (this.grid[y]![x] === VOID) this.grid[y]![x] = WALL;
        }
    for (const [x, y] of DOORWAYS) this.grid[y]![x] = FLOOR;

    // back-wall face: the top ring row + the first interior row read as one tall wall.
    // Indoor rooms and the hallway get one; the courtyard (outdoor) does not.
    this.faceTiles.clear();
    this.faceOwner.clear();
    for (const z of zones) {
      if (z.kind !== "personal" && z.kind !== "common" && z.kind !== "hall") continue;
      const topDoor = new Set(DOORWAYS.filter(([, dy]) => dy === z.y - 1).map(([dx]) => dx));
      for (let x = z.x; x < z.x + z.w; x++) {
        if (topDoor.has(x)) continue;
        this.grid[z.y]![x] = WALL;
        for (const y of [z.y - 1, z.y]) {
          this.faceTiles.add(`${x},${y}`);
          // explicit owner: the hall face shares row 16 with the bedrooms' bottom ring
          this.faceOwner.set(`${x},${y}`, z);
        }
      }
    }
  }

  /** per-tile pixel texture: plank grain, woven tile, grass tufts — hard edges only */
  private paintZoneFloor(g: Phaser.GameObjects.Graphics, z: Zone) {
    const PX = 2; // art-pixel size, matches the sprite tileset
    const px = (x: number, y: number, w: number, h: number, c: number) => {
      g.fillStyle(c, 1);
      g.fillRect(x * PX, y * PX, w * PX, h * PX);
    };
    const U = TILE / PX; // art pixels per tile (16)

    g.fillStyle(z.floor, 1);
    g.fillRect(t(z.x), t(z.y), t(z.w), t(z.h));

    const dark = mix(z.floor, 0x3d3128, 0.22);
    const darker = mix(z.floor, 0x3d3128, 0.34);
    const light = mix(z.floor, 0xf6ead6, 0.3);

    for (let ty = z.y; ty < z.y + z.h; ty++) {
      for (let tx = z.x; tx < z.x + z.w; tx++) {
        const ox = tx * U;
        const oy = ty * U;
        const alt = (tx + ty) % 2 === 0;

        if (z.kind === "personal") {
          // woven square tile: 1px grout + dithered weave, alternating phase
          if (alt) px(ox, oy, U, U, mix(z.floor, 0x3d3128, 0.1));
          for (let yy = 2; yy < U - 1; yy += 2)
            for (let xx = alt ? 2 : 3; xx < U - 1; xx += 2) px(ox + xx, oy + yy, 1, 1, light);
          px(ox, oy, U, 1, dark);
          px(ox, oy, 1, U, dark);
        } else if (z.kind === "outdoor") {
          // grass: flat base + scattered 1px tufts, hard edged
          const seed = (tx * 73856093) ^ (ty * 19349663);
          for (let i = 0; i < 7; i++) {
            const sx = Math.abs((seed >> (i * 3)) % U);
            const sy = Math.abs((seed >> (i * 2 + 5)) % U);
            px(ox + sx, oy + sy, 1, 2, i % 3 === 0 ? light : dark);
          }
        } else if (z.kind === "hall") {
          // light speckled linoleum: sparse 1px flecks, faint seams every 2 tiles
          const seed = Math.abs((tx * 73856093) ^ (ty * 19349663));
          const tones = [
            mix(z.floor, 0x3d3128, 0.14),
            mix(z.floor, 0xffffff, 0.45),
            mix(z.floor, HALL_STRIPE, 0.45),
          ];
          for (let i = 0; i < 9; i++) {
            const sx = Math.abs((seed >> (i % 11)) * (i + 3)) % U;
            const sy = Math.abs((seed >> ((i % 7) + 2)) * (i + 5)) % U;
            px(ox + sx, oy + sy, 1, 1, tones[(seed + i) % tones.length]!);
          }
          const seam = mix(z.floor, 0x3d3128, 0.08);
          if (tx % 2 === 0) px(ox, oy, 1, U, seam);
          if (ty % 2 === 0) px(ox, oy, U, 1, seam);
        } else if (z.floorStyle === "linoleum") {
          // two-tone 16px checker (8 art px) with 1px grout
          const half = U / 2;
          for (let cy = 0; cy < 2; cy++)
            for (let cx = 0; cx < 2; cx++) {
              const c = (cx + cy) % 2 === 0 ? z.floor : mix(z.floor, 0x3d3128, 0.12);
              px(ox + cx * half, oy + cy * half, half, half, c);
              px(ox + cx * half, oy + cy * half, half, 1, darker);
              px(ox + cx * half, oy + cy * half, 1, half, darker);
            }
        } else {
          // wood planks: staggered joints + seeded per-tile grain variation
          const stagger = ty % 2 === 0 ? 0 : U / 2;
          const seed = Math.abs((tx * 73856093) ^ (ty * 19349663));
          const worn = seed % 15 === 0;
          if (ty % 2 === 0) px(ox, oy, U, U, mix(z.floor, 0xf6ead6, 0.12));
          if (worn) {
            // scattered worn plank: off-value tile + a small scuff scratch
            px(ox, oy, U, U, mix(z.floor, seed % 2 === 0 ? 0x3d3128 : 0xf6ead6, 0.16));
            const sx = 3 + (seed % 6);
            const sy = 6 + ((seed >> 3) % 5);
            px(ox + sx, oy + sy, 4, 1, darker);
            px(ox + sx + 2, oy + sy + 1, 3, 1, darker);
          }
          px(ox, oy, U, 1, darker); // plank seam
          px(ox, oy + 1, U, 1, light);
          const skip = seed % 4;
          const gj = (seed >> 5) % 3; // grain jitter
          if (skip !== 0) px(ox + 2, oy + 4 + gj + (tx % 2) * 2, U - 6, 1, dark);
          if (skip !== 1) px(ox + 3 + gj, oy + 11 - (ty % 2) * 2, U - 8, 1, dark);
          px(ox + ((stagger + 4) % U), oy + 2, 1, U - 2, darker); // joint
        }
      }
    }
  }

  /** one wall block: flat 3-tone bands, hard edges, optional wallpaper pattern */
  private drawWallTile(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    base: number,
    pattern: NonNullable<ItemDef["wallPattern"]> = "flat",
  ) {
    const shade = mix(base, 0x2b2027, 0.32);
    const deep = mix(base, 0x2b2027, 0.52);
    const hi = mix(base, 0xfaf0e0, 0.4);
    const bx = t(x);
    const by = t(y);
    const fill = (c: number, px: number, py: number, w: number, h: number) => {
      g.fillStyle(c, 1);
      g.fillRect(bx + px, by + py, w, h);
    };
    fill(base, 0, 0, TILE, TILE);
    // wallpaper pattern lives in the field between the trim rail and the baseboard
    if (pattern !== "flat") {
      const accent = mix(base, 0x2b2027, 0.24);
      const light = mix(base, 0xfaf0e0, 0.34);
      if (pattern === "stripes") {
        for (let i = 0; i < TILE; i += 8) fill(accent, i, 8, 4, TILE - 18);
      } else if (pattern === "checker") {
        for (let cy = 8; cy < TILE - 10; cy += 8)
          for (let cx = 0; cx < TILE; cx += 8)
            if (((cx + cy) / 8) % 2 === 0) fill(accent, cx, cy, 8, 8);
      } else if (pattern === "botanical") {
        for (const [lx, ly] of [
          [5, 10],
          [19, 14],
          [11, 20],
        ] as const) {
          fill(accent, lx, ly, 6, 2);
          fill(accent, lx + 2, ly - 3, 2, 8);
        }
      } else if (pattern === "night") {
        for (const [sx, sy] of [
          [4, 11],
          [14, 9],
          [24, 15],
          [9, 19],
          [21, 22],
        ] as const)
          fill(light, sx, sy, 2, 2);
      } else if (pattern === "graph") {
        for (let i = 0; i < TILE; i += 8) {
          fill(accent, i, 8, 2, TILE - 18);
          fill(accent, 0, 8 + i, TILE, 2);
        }
      } else if (pattern === "sunset") {
        fill(light, 0, 8, TILE, 6);
        fill(accent, 0, 18, TILE, TILE - 28);
      }
    }
    fill(hi, 0, 2, TILE, 4); // trim rail highlight
    fill(shade, 0, 6, TILE, 2);
    fill(deep, 0, TILE - 6, TILE, 6); // baseboard
    fill(shade, 0, TILE - 8, TILE, 2);
    // 2px dither band above the baseboard: fakes volume without any blur
    for (let i = 0; i < TILE; i += 4) fill(shade, i, TILE - 10, 2, 2);
    fill(deep, 0, 0, 2, TILE); // 1 art-pixel seam between wall blocks
  }

  /** wallpaper field of a back-wall face tile; crown on the top row, rail + baseboard on the bottom */
  private drawFaceTile(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    paper: number,
    trim: number,
    isTopRow: boolean,
    pattern: NonNullable<ItemDef["wallPattern"]> | "wainscot" = "flat",
  ) {
    const bx = t(x);
    const by = t(y);
    const fill = (c: number, px: number, py: number, w: number, h: number) => {
      g.fillStyle(c, 1);
      g.fillRect(bx + px, by + py, w, h);
    };
    const accent = mix(paper, 0x2b2027, 0.2);
    const light = mix(paper, 0xfaf0e0, 0.4);
    const shade = mix(trim, 0x2b2027, 0.32);
    const deep = mix(trim, 0x2b2027, 0.55);
    const hi = mix(trim, 0xfaf0e0, 0.45);
    fill(paper, 0, 0, TILE, TILE);
    // pattern is phased on the 2-row face so it reads as one continuous wall
    const oy = isTopRow ? 0 : TILE;
    if (pattern === "flat") {
      for (let i = 2; i < TILE; i += 8) fill(mix(paper, 0x2b2027, 0.07), i, 0, 2, TILE);
    } else if (pattern === "stripes") {
      for (let i = 0; i < TILE; i += 8) fill(accent, i, 0, 4, TILE);
    } else if (pattern === "checker") {
      for (let cy = 0; cy < TILE; cy += 8)
        for (let cx = 0; cx < TILE; cx += 8)
          if (((cx + cy + oy) / 8) % 2 === 0) fill(accent, cx, cy, 8, 8);
    } else if (pattern === "botanical") {
      const leaves = isTopRow
        ? ([[5, 12], [20, 20]] as const)
        : ([[12, 6], [24, 14], [4, 18]] as const);
      for (const [lx, ly] of leaves) {
        fill(accent, lx, ly, 6, 2);
        fill(accent, lx + 2, ly - 3, 2, 8);
      }
    } else if (pattern === "night") {
      const stars = isTopRow
        ? ([[4, 10], [16, 14], [26, 9], [10, 24]] as const)
        : ([[6, 4], [20, 8], [13, 14], [27, 18]] as const);
      for (const [sx, sy] of stars) fill(light, sx, sy, 2, 2);
    } else if (pattern === "graph") {
      for (let i = 0; i < TILE; i += 8) {
        fill(accent, i, 0, 2, TILE);
        fill(accent, 0, i, TILE, 2);
      }
    } else if (pattern === "sunset") {
      if (isTopRow) fill(light, 0, 8, TILE, TILE - 8);
      else fill(accent, 0, 0, TILE, TILE);
    } else if (pattern === "wainscot" && !isTopRow) {
      // institutional corridor: darker vertical-board paneling below a chair rail;
      // the top row stays plain painted wall
      const board = mix(paper, 0x2b2027, 0.25);
      fill(board, 0, 0, TILE, TILE);
      for (let i = 0; i < TILE; i += 8) fill(mix(board, 0x2b2027, 0.28), i, 6, 2, TILE - 6);
      fill(mix(board, 0xfaf0e0, 0.18), 2, 6, 2, TILE - 13); // board edge catch-light
    }
    if (isTopRow) {
      fill(deep, 0, 0, TILE, 6); // crown
      fill(hi, 0, 6, TILE, 2);
    } else {
      if (pattern === "wainscot") fill(mix(trim, 0xfaf0e0, 0.55), 0, 0, TILE, 2); // rail cap highlight
      fill(shade, 0, 4, TILE, 2); // chair rail
      fill(hi, 0, 6, TILE, 1);
      fill(shade, 0, TILE - 9, TILE, 2);
      fill(deep, 0, TILE - 7, TILE, 7); // baseboard
    }
  }

  /** side / bottom wall seen from above: dark cap with a lighter inset — wall thickness */
  private drawCapTile(g: Phaser.GameObjects.Graphics, x: number, y: number, base: number) {
    const cap = mix(base, 0x2b2027, 0.5);
    g.fillStyle(cap, 1);
    g.fillRect(t(x), t(y), TILE, TILE);
    g.fillStyle(mix(cap, 0xfaf0e0, 0.14), 1);
    g.fillRect(t(x) + 4, t(y) + 4, TILE - 8, TILE - 8);
    g.fillStyle(mix(cap, 0x2b2027, 0.4), 1);
    g.fillRect(t(x), t(y), 2, TILE);
  }

  /** face tiles of my room — the tappable wallpaper surface */
  private myWallTiles(): Array<[number, number]> {
    const r = PERSONAL_RECTS[0]!;
    const out: Array<[number, number]> = [];
    for (const y of [r.y - 1, r.y])
      for (let x = r.x; x < r.x + r.w; x++)
        if (this.faceTiles.has(`${x},${y}`)) out.push([x, y]);
    return out;
  }

  /**
   * Repaints my room's walls from the equipped wallpaper item. Drawn as an overlay
   * on top of the baked floormap so swapping is instant and never rebuilds the world.
   */
  applyWallpaper() {
    const item = ITEM_CATALOG[this.getWallpaperId()];
    this.wallGfx?.destroy();
    this.wallGfx = null;
    if (!item || item.wallColor === undefined) return; // default: keep the mood trim
    const g = this.add.graphics().setDepth(0.5);
    const trim = this.myTrim;
    const r = PERSONAL_RECTS[0]!;
    for (const [x, y] of this.myWallTiles())
      this.drawFaceTile(g, x, y, item.wallColor, trim, y === r.y - 1, item.wallPattern ?? "flat");
    this.wallGfx = g;
  }

  private paintFloor(zones: Zone[]) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    this.paintExterior(g);
    for (const z of zones) this.paintZoneFloor(g, z);
    this.paintHallStripes(g);

    // ---- walls: flat 3-tone pixel bands, hard edges ----
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.grid[y]![x] !== WALL) continue;
        const owner = this.faceOwner.get(`${x},${y}`);
        if (owner) {
          const top = y === owner.y - 1;
          this.drawFaceTile(
            g,
            x,
            y,
            mix(owner.wall, 0xf3e6d0, 0.38),
            owner.wall,
            top,
            owner.kind === "hall" ? "wainscot" : "flat",
          );
          // the face's top edge is the building's outer wall when open ground is behind it
          if (top && this.isVoid(x, y - 1)) this.drawBrickParapet(g, x, y);
          continue;
        }
        if (this.touchesVoid(x, y)) {
          this.drawBrickTile(g, x, y);
          continue;
        }
        const zone = this.zoneNear(x, y, zones);
        const base = zone?.wall ?? NEUTRAL_WALL;
        if (zone && (zone.kind === "personal" || zone.kind === "common"))
          this.drawCapTile(g, x, y, base);
        else this.drawWallTile(g, x, y, base);
      }
    }


    // ---- doorway thresholds: pixel stone sill ----
    for (const [x, y] of DOORWAYS) {
      g.fillStyle(0xbfae95, 1);
      g.fillRect(t(x), t(y), TILE, TILE);
      g.fillStyle(0x8f7f68, 1);
      g.fillRect(t(x), t(y), TILE, 2);
      g.fillRect(t(x), t(y) + TILE - 2, TILE, 2);
      for (let i = 0; i < TILE; i += 8) {
        g.fillStyle(0xd3c3a9, 1);
        g.fillRect(t(x) + i, t(y) + 6, 6, 2);
        g.fillRect(t(x) + i + 2, t(y) + 18, 6, 2);
      }
    }

    g.generateTexture("floormap", GRID_W * TILE, GRID_H * TILE);
    g.destroy();
    this.add.image(0, 0, "floormap").setOrigin(0, 0).setDepth(0);
    this.layDoormats();
  }

  private isVoid(x: number, y: number) {
    return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && this.grid[y]![x] === VOID;
  }

  /** outer building walls: any wall tile with open ground next to it (8-neighbour) */
  private touchesVoid(x: number, y: number) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && this.isVoid(x + dx, y + dy)) return true;
    return false;
  }

  /** campus ground on every VOID tile: dark grass, sparse tufts, stone path, wall shadows */
  private paintExterior(g: Phaser.GameObjects.Graphics) {
    const PX = 2;
    const U = TILE / PX;
    const px = (x: number, y: number, w: number, h: number, c: number) => {
      g.fillStyle(c, 1);
      g.fillRect(x * PX, y * PX, w * PX, h * PX);
    };
    const tuftLight = mix(EXT_GROUND, 0xd8e6b0, 0.28);
    const tuftDark = mix(EXT_GROUND, 0x1e2a18, 0.3);
    const shadow = mix(EXT_GROUND, 0x1e2a18, 0.38);
    const stone = 0xa59d8c;
    const stoneSh = 0x7d7668;
    const stoneHi = 0xc2bbab;
    const isPath = (x: number, y: number) =>
      (PATH_ROWS.includes(y) && x >= PATH_X[0] && x <= PATH_X[1]) ||
      (SPUR_COLS.includes(x) && y >= SPUR_ROWS[0] && y <= SPUR_ROWS[1]);
    for (let ty = 0; ty < GRID_H; ty++)
      for (let tx = 0; tx < GRID_W; tx++) {
        if (this.grid[ty]![tx] !== VOID) continue;
        const ox = tx * U;
        const oy = ty * U;
        const seed = Math.abs((tx * 73856093) ^ (ty * 19349663));
        px(ox, oy, U, U, EXT_GROUND);
        if (isPath(tx, ty)) {
          // two staggered flagstones per tile, 1px seams, hard highlights
          px(ox, oy, U, U, stone);
          const off = ty % 2 === 0 ? 0 : U / 2;
          px(ox, oy, U, 1, stoneSh);
          px(ox + ((off + 7) % U), oy, 1, U, stoneSh);
          px(ox, oy + 1, U, 1, stoneHi);
          if (seed % 3 === 0) px(ox + 3 + (seed % 5), oy + 6 + (seed % 4), 2, 1, stoneSh);
          // grass creeping into the path edges
          if (!isPath(tx, ty - 1)) px(ox, oy, U, 1, tuftDark);
          if (!isPath(tx, ty + 1)) px(ox, oy + U - 1, U, 1, tuftDark);
        } else if (seed % 3 !== 0) {
          for (let i = 0; i < 3; i++) {
            const sx = Math.abs((seed >> (i * 3)) % (U - 1));
            const sy = Math.abs((seed >> (i * 2 + 5)) % (U - 2));
            px(ox + sx, oy + sy, 1, 2, i === 0 ? tuftLight : tuftDark);
          }
        }
        // hard 3px contact shadow below the building
        if (ty > 0 && this.grid[ty - 1]![tx] !== VOID) px(ox, oy, U, 3, shadow);
      }
  }

  /** thick brick cap for the building's outer walls, seen from above */
  private drawBrickTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const bx = t(x);
    const by = t(y);
    g.fillStyle(BRICK, 1).fillRect(bx, by, TILE, TILE);
    for (let row = 0; row < 4; row++) {
      const yy = by + row * 8;
      g.fillStyle(BRICK_MORTAR, 1).fillRect(bx, yy + 6, TILE, 2);
      g.fillStyle(BRICK_HI, 1).fillRect(bx, yy, TILE, 2);
      const off = row % 2 === 0 ? 0 : 8;
      for (let c = off; c < TILE; c += 16) g.fillStyle(BRICK_MORTAR, 1).fillRect(bx + c, yy, 2, 6);
    }
  }

  /** brick parapet replacing a face tile's crown where the face meets the outside */
  private drawBrickParapet(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const bx = t(x);
    const by = t(y);
    g.fillStyle(BRICK, 1).fillRect(bx, by, TILE, 8);
    g.fillStyle(BRICK_HI, 1).fillRect(bx, by, TILE, 2);
    g.fillStyle(BRICK_MORTAR, 1).fillRect(bx, by + 6, TILE, 2);
    for (let c = x % 2 === 0 ? 0 : 8; c < TILE; c += 16) g.fillStyle(BRICK_MORTAR, 1).fillRect(bx + c, by + 2, 2, 4);
  }

  /** two thin painted guide stripes down the corridor, one tile in from each floor edge */
  private paintHallStripes(g: Phaser.GameObjects.Graphics) {
    const x0 = t(HALL.x) + 8;
    const x1 = t(HALL.x + HALL.w) - 8;
    for (const row of [HALL.y + 2, HALL.y + HALL.h - 1]) {
      const y = t(row) - 2;
      g.fillStyle(HALL_STRIPE, 1).fillRect(x0, y, x1 - x0, 4);
      // worn chips every few tiles so it reads as paint, not a UI line
      g.fillStyle(mix(HALL_STRIPE, HALL.floor, 0.6), 1);
      for (let x = x0 + 22; x < x1; x += 150) g.fillRect(x, y + (x % 4 === 0 ? 0 : 2), 4, 2);
    }
  }

  /**
   * A 2-tile window on a personal room's back wall (face columns WINDOW_COLS), with
   * one sky image per phase stacked in the glass, wood frame + sill, accent curtains,
   * and morning/golden sunbeams on the floor below.
   */
  private buildWindow(rect: Rect, accent: number) {
    const col = rect.x + WINDOW_COLS[0];
    const fx = t(col) + 4; // frame outer
    const fy = t(rect.y - 1) + 10;
    const fw = TILE * WINDOW_COLS.length - 8;
    const fh = 46;
    const gx = fx + 6;
    const gy = fy + 5;
    const skies = {} as Record<Phase, Phaser.GameObjects.Image>;
    for (const p of PHASES)
      skies[p] = this.add.image(gx, gy, `sky-${p}`).setOrigin(0, 0).setDepth(3.9).setAlpha(0);
    this.skies.push(skies);

    const ink = 0x241c26;
    const wood = 0xc9a477;
    const woodSh = 0x9c7a52;
    const woodHi = 0xe6c99a;
    const f = this.add.graphics().setDepth(4.02);
    // frame drawn as four bars so the sky shows through the 44x36 glass
    const bar = (x: number, y: number, w: number, h: number) => {
      f.fillStyle(ink, 1).fillRect(x, y, w, h);
      f.fillStyle(wood, 1).fillRect(x + 2, y + 2, Math.max(0, w - 4), Math.max(0, h - 4));
      if (w > h) f.fillStyle(woodHi, 1).fillRect(x + 2, y + 2, w - 4, 2);
      else f.fillStyle(woodHi, 1).fillRect(x + 2, y + 2, 2, h - 4);
    };
    bar(fx, fy, fw, 7); // head
    bar(fx, fy + fh - 7, fw, 7); // bottom rail
    bar(fx, fy, 8, fh); // left stile
    bar(fx + fw - 8, fy, 8, fh); // right stile
    // mullions: one cross
    f.fillStyle(wood, 1).fillRect(gx + 21, gy, 2, 36);
    f.fillStyle(wood, 1).fillRect(gx, gy + 17, 44, 2);
    f.fillStyle(woodSh, 1).fillRect(gx + 23, gy, 1, 36);
    // sill
    f.fillStyle(ink, 1).fillRect(fx - 4, fy + fh - 4, fw + 8, 8);
    f.fillStyle(woodHi, 1).fillRect(fx - 2, fy + fh - 2, fw + 4, 2);
    f.fillStyle(wood, 1).fillRect(fx - 2, fy + fh, fw + 4, 2);

    // curtains pulled to the sides, accent 3-tone with fold lines and a tie-back
    const cur = this.add.graphics().setDepth(4.04);
    const cHi = mix(accent, 0xfaf0e0, 0.35);
    const cSh = mix(accent, 0x2b2027, 0.3);
    cur.fillStyle(ink, 1).fillRect(fx - 6, fy - 4, fw + 12, 3); // rod
    const curtain = (x: number, flip: boolean) => {
      const h = fh - 6;
      cur.fillStyle(ink, 1).fillRect(x - 1, fy - 1, 12, h + 2);
      cur.fillStyle(accent, 1).fillRect(x, fy, 10, h);
      cur.fillStyle(cHi, 1).fillRect(flip ? x + 6 : x + 2, fy, 2, h);
      cur.fillStyle(cSh, 1).fillRect(flip ? x + 2 : x + 6, fy, 2, h);
      cur.fillStyle(ink, 1).fillRect(x, fy + 26, 10, 2); // tie-back
    };
    curtain(fx - 4, false);
    curtain(fx + fw - 6, true);

    // sunbeams: stair-stepped parallelograms, additive, hard edges
    for (const [phase, dir, color] of [
      ["morning", -1, 0xffe6b8],
      ["golden", 1, 0xffb070],
    ] as const) {
      const b = this.add.graphics().setDepth(1.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const y0 = t(rect.y + 1);
      // clipped to the room's floor so a beam never spills onto the side walls
      const minX = t(rect.x);
      const maxX = t(rect.x + rect.w);
      const band = (x: number, y: number, w: number, a: number) => {
        const l = Math.max(minX, x);
        const r = Math.min(maxX, x + w);
        if (r > l) b.fillStyle(color, a).fillRect(l, y, r - l, 4);
      };
      for (let i = 0; i < 28; i++) {
        const sx = gx + dir * Math.floor(i / 2) * 4;
        band(sx, y0 + i * 4, 44, 0.6);
        band(sx + 10, y0 + i * 4, 24, 1);
      }
      this.beams.push({ g: b, phase });
    }
  }

  // ---------- time of day ----------

  /** re-reads the phase; crossfades over PHASE_FADE_MS unless instant */
  refreshPhase(instant = false) {
    const next = this.getPhase();
    if (next === this.phase) return;
    this.phase = next;
    const from: Look = { ...this.look, w: { ...this.look.w } };
    const to = lookFor(next);
    this.phaseTween?.stop();
    this.phaseTween = null;
    if (instant) {
      this.applyLook(to);
      return;
    }
    this.phaseTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: PHASE_FADE_MS,
      ease: "Sine.easeInOut",
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        const w = {} as Record<Phase, number>;
        for (const p of PHASES) w[p] = from.w[p] + (to.w[p] - from.w[p]) * k;
        this.applyLook({
          tint: lerpColor(from.tint, to.tint, k),
          tintAlpha: from.tintAlpha + (to.tintAlpha - from.tintAlpha) * k,
          night: from.night + (to.night - from.night) * k,
          w,
        });
      },
    });
  }

  private applyLook(look: Look) {
    this.look = look;
    this.lighting.setLook(look.tint, look.tintAlpha, look.night);
    // stacked crossfade: each layer's alpha = its weight over the weight beneath it
    for (const sky of this.skies) {
      let acc = 0;
      for (const p of PHASES) {
        acc += look.w[p];
        sky[p].setAlpha(acc > 0 ? look.w[p] / acc : 0);
      }
    }
    for (const b of this.beams) b.g.setAlpha(0.2 * look.w[b.phase]);
    // backdrop beyond the map edge: ground colour under the same tint + darkness
    const mulCh = (s: number) => {
      const c = (EXT_GROUND >> s) & 255;
      const tc = (look.tint >> s) & 255;
      return Math.round(c * (1 - look.tintAlpha + (look.tintAlpha * tc) / 255));
    };
    const tinted = (mulCh(16) << 16) | (mulCh(8) << 8) | mulCh(0);
    const bg = lerpColor(tinted, DARKNESS_COLOR, DARKNESS_ALPHA * look.night);
    this.cameras.main.setBackgroundColor(bg);
  }

  /** register a night light; follow keeps it on a moving sprite */
  private light(spec: LightSpec) {
    return this.lighting.add(spec);
  }

  /** exterior scenery: a few trees + shrubs, lamp posts along the path */
  private decorateExterior() {
    const trees: Array<[number, number, number]> = [
      [22.5, 3.3, 0.8],
      [43.5, 3.1, 0.75],
      [24.5, 28.4, 0.68],
    ];
    for (const [x, y, s] of trees) this.add.sprite(t(x), t(y), "tree").setScale(s).setDepth(t(y));
    for (const [x, y] of [
      [64, 4.6],
      [82, 31.2],
    ] as const)
      this.add.sprite(t(x), t(y), "bush").setDepth(t(y));
    for (const x of [15, 40, 66]) {
      // stand on the grass just south of the path, clear of the building wall
      const y = t(PATH_ROWS[1]! + 1) + 20 - 46;
      this.add.sprite(t(x), y, "lamppost").setDepth(y);
      this.light({ x: t(x), y: y - 36, color: 0xffd9a0, radius: 80 });
    }
  }

  /** thin woven mat on every doorway; bedroom mats sit on the first hall floor row outside the wall */
  private layDoormats() {
    DOORWAYS.forEach(([x, y], i) => {
      const personal = i < 6 ? ROOMS[Math.floor(i / 2)] : undefined;
      const tint = personal
        ? mix(Phaser.Display.Color.HexStringToColor(personal.accentColor).color, 0xd8c8ad, 0.45)
        : 0xc3b39a;
      const my = personal ? HALL.y + 1 : y;
      this.add
        .image(t(x) + TILE / 2, t(my) + TILE / 2, "doormat")
        .setTint(tint)
        .setDepth(1.2);
    });
  }

  private zoneNear(x: number, y: number, zones: Zone[]): Zone | undefined {
    const hit = (z: Zone) => x >= z.x - 1 && x <= z.x + z.w && y >= z.y - 1 && y <= z.y + z.h;
    // rooms own their trim colour; the hallway only claims walls nobody else touches
    return zones.find((z) => z.kind !== "hall" && hit(z)) ?? zones.find(hit);
  }


  private buildColliders() {
    this.walls = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.grid[y]![x] !== WALL) continue;
        const body = this.add.zone(t(x) + TILE / 2, t(y) + TILE / 2, TILE, TILE);
        this.walls.add(body);
      }
    }
  }

  // ---------- decor & interactives ----------

  private label(x: number, y: number, text: string, color = "#33272c", size = 14) {
    return this.add
      .text(x, y, text, {
        fontFamily: '"Pixelify Sans", sans-serif',
        fontSize: `${size}px`,
        color,
        fontStyle: "600",
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0.95);
  }

  private prop(def: PropDef) {
    const s = this.add.sprite(def.x, def.y, def.key).setDepth(def.y + (def.depthBias ?? 0));
    this.collecting?.push(s);
    if (def.scale) s.setScale(def.scale);
    if (def.tint) s.setTint(def.tint);
    if (def.solid) {
      const zw = s.displayWidth * 0.8;
      const zh = s.displayHeight * 0.4;
      const zy = def.y + s.displayHeight * 0.2;
      const zone = this.add.zone(def.x, zy, zw, zh);
      this.walls.add(zone);
      this.collecting?.push(zone);
      for (let ty = Math.floor((zy - zh / 2) / TILE); ty <= Math.floor((zy + zh / 2) / TILE); ty++)
        for (let tx = Math.floor((def.x - zw / 2) / TILE); tx <= Math.floor((def.x + zw / 2) / TILE); tx++)
          if (this.grid[ty]?.[tx] === FLOOR) this.grid[ty]![tx] = BLOCKED;
    }
    if (def.payload) {
      const ring = this.add
        .image(def.x, def.y + 6, "glow")
        .setDepth(1)
        .setAlpha(0)
        .setScale(1.1)
        .setTint(0xf2d79a);
      this.collecting?.push(ring);
      this.interactives.push({ sprite: s, ring, payload: def.payload });
      // 2px stepped bob — reads as sprite animation, not a smooth CSS float.
      // Never attach while editing: it would fight the drag handler's setPosition.
      if (!this.editMode) {
        this.tweens.add({
          targets: s,
          y: def.y - 2,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: "Stepped",
          easeParams: [2],
        });
      }
    }
    return s;
  }

  /** Generic personal-room builder: same code path for every person record. */
  private buildPersonalRoom(room: PersonRoom, rect: Rect, doorX: number, editable = false) {
    const mood = MOODS[room.mood];
    const accent = Phaser.Display.Color.HexStringToColor(room.accentColor).color;

    // accent trim strip along the top wall — accent as trim, not as base tone
    this.add
      .rectangle(t(rect.x), t(rect.y - 1) + 8, t(rect.w), 2, accent, 1)
      .setOrigin(0, 0)
      .setDepth(1);

    // woven area rug, accent-tinted (opaque pixels, no soft blend)
    this.add
      .image(t(rect.x + rect.w / 2), t(rect.y + rect.h / 2 + 0.2), "rug")
      .setTint(mix(mood.posterAccent, 0xbca584, 0.18))
      .setScale(0.85)
      .setDepth(1);

    // the poster is a real catalog item now (see ITEM_CATALOG.poster_default) and
    // is drawn through room.layout like every other prop — no hardcoded rectangles.

    // the back wall faces outside: a window in the reserved face columns
    this.buildWindow(rect, accent);

    if (editable) this.renderMyLayout(room, rect);
    else this.renderLayout(room, rect, room.layout);




    // ---- doorway in the hall's back wall: frame, stickers, sconce, placard, glow, sound cue ----
    const dx = t(doorX) + TILE;
    const dy = t(16) + TILE / 2;
    const faceTop = t(16);
    const faceH = TILE * 2;
    const openL = t(doorX);
    const openR = t(doorX + 2);
    {
      const fr = this.add.graphics().setDepth(4);
      const jamb = (x: number) => {
        fr.fillStyle(0x241c26, 1).fillRect(x - 2, faceTop, 8, faceH);
        fr.fillStyle(accent, 1).fillRect(x, faceTop, 4, faceH);
        fr.fillStyle(mix(accent, 0xfaf0e0, 0.35), 1).fillRect(x, faceTop, 2, faceH);
      };
      jamb(openL - 4); // left jamb: inner edge of the face tile left of the door
      jamb(openR); // right jamb
      // header across the top of row 16
      fr.fillStyle(0x241c26, 1).fillRect(openL - 6, faceTop, openR - openL + 12, 8);
      fr.fillStyle(accent, 1).fillRect(openL - 4, faceTop, openR - openL + 8, 6);
      fr.fillStyle(mix(accent, 0xfaf0e0, 0.35), 1).fillRect(openL - 4, faceTop, openR - openL + 8, 2);
    }

    // door stickers on the face left of the frame, staggered
    room.doorStickers.slice(0, 3).forEach((st, i) => {
      const key = `sticker-${st}`;
      if (!this.textures.exists(key)) return;
      this.add
        .image(t(doorX - 1) + (i % 2 === 0 ? 12 : 18), faceTop + 16 + i * 16, key)
        .setDepth(6)
        .setScale(0.7)
        .setTint(0xfffdf5);
    });

    // presence: hard-edged dithered pixel halo in the doorway
    const glow = this.add
      .image(dx, dy - 2, "glow")
      .setTint(mood.glow)
      .setDepth(3)
      .setScale(0.9)
      .setAlpha(room.isActive ? 0.4 : 0.1);
    // pixel wall sconce on the face right of the frame
    const sconceX = openR + 12;
    this.add.rectangle(sconceX, faceTop + 18, 8, 6, 0x241c26, 1).setDepth(5);
    this.add
      .rectangle(sconceX, faceTop + 19, 4, 3, room.isActive ? mood.glow : 0x6b6270, 1)
      .setDepth(6);
    this.light({ x: sconceX, y: faceTop + 22, color: 0xffd9a0, radius: 40 });

    // nameplate mounted on the face; an away note becomes its second line
    const away = !room.isActive ? room.awayNote : undefined;
    const plate = this.wallSign(openR + 20, t(17), away ? [room.name, away] : [room.name], "cream");
    if (away) this.add.image(plate.right + 4 + 22, t(17), "awaynote").setDepth(4.5);

    if (room.isActive) {
      this.tweens.add({
        targets: [glow],
        alpha: { from: 0.55, to: 0.22 },
        duration: mood.pulseMs,
        yoyo: true,
        repeat: -1,
        ease: "Stepped",
        easeParams: [3],
      });
      this.spawnSoundCue(dx, dy - 10, mood.glow);
      this.spawnSoundCue(t(rect.x + 2), t(rect.y + 1.2), mood.glow);
    }
  }

  /**
   * Wall-mounted sign: text in the world lives on signs on walls, never floating on floors.
   * `left` is the sign's left edge; `cy` its vertical centre. Returns its bounds.
   */
  private wallSign(
    left: number,
    cy: number,
    lines: string[],
    style: "cream" | "dark",
    anchor: "left" | "center" = "left",
  ) {
    const ink = 0x241c26;
    const bg = style === "cream" ? 0xf3ead2 : 0x33292f;
    const fg = style === "cream" ? "#2b2027" : "#f3ead2";
    const texts = lines.map((s, i) =>
      this.add
        .text(0, 0, s, {
          fontFamily: '"Pixelify Sans", sans-serif',
          fontSize: i === 0 ? "11px" : "9px",
          color: i === 0 ? fg : style === "cream" ? "#6b5c50" : "#cdbfa8",
          fontStyle: i === 0 ? "700" : "500",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(4.6),
    );
    const lineH = [12, 10];
    const w = Math.ceil(Math.max(...texts.map((tx) => tx.width)) / 2) * 2 + 12;
    const h = lines.reduce((a, _, i) => a + (lineH[i] ?? 10), 0) + 6;
    const x0 = Math.round(anchor === "left" ? left : left - w / 2);
    const y0 = Math.round(cy - h / 2);
    const g = this.add.graphics().setDepth(4.5);
    g.fillStyle(ink, 1).fillRect(x0, y0, w, h);
    g.fillStyle(bg, 1).fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
    g.fillStyle(ink, 0.25).fillRect(x0 + 2, y0 + h - 4, w - 4, 2); // bottom lip shade
    let yy = y0 + 3;
    texts.forEach((tx, i) => {
      const lh = lineH[i] ?? 10;
      tx.setPosition(x0 + w / 2, yy + lh / 2);
      yy += lh;
    });
    return { left: x0, right: x0 + w, top: y0, bottom: y0 + h };
  }

  // ---------- layout rendering + room editor ----------

  private payloadFor(room: PersonRoom, item: ItemDef): PopupPayload | undefined {
    return item.interactive === "songs"
      ? { kind: "songs", room }
      : item.interactive === "bulletin"
        ? { kind: "bulletin", room }
        : item.interactive === "companion"
          ? { kind: "companion", room }
          : item.interactive === "watching"
            ? { kind: "watching", room }
            : item.interactive === "art"
              ? {
                  kind: "art" as const,
                  title: item.name,
                  textureKey: zoomTextureKey(item.textureKey),
                  accent: room.accentColor,
                }
              : undefined;
  }

  /**
   * Per-room recolour for mood-carrying decor, same trick the rug already uses:
   * greyscale-authored textures multiplied by a pale accent read as that room's colour.
   */
  private moodTint(room: PersonRoom, item: ItemDef): number | undefined {
    return displayTintFor(item, room.mood);
  }

  /** footprint-aware sprite placement for rooms that are not editable */
  private renderLayout(room: PersonRoom, rect: Rect, layout: PlacedItem[]) {
    for (const placed of layout) {
      const item = ITEM_CATALOG[placed.itemId];
      if (!item) continue;
      const rotation = placed.rotation ?? 0;
      const f = effectiveFootprint(item, rotation);
      const payload = this.payloadFor(room, item);
      const def: PropDef = {
        key: item.textureKey,
        x: t(rect.x + placed.gx + f.w / 2),
        y: t(rect.y + placed.gy + f.h / 2),
        solid: item.solid,
      };
      const tint = this.moodTint(room, item);
      if (tint) def.tint = tint;
      if (payload) def.payload = payload;

      const sprite = this.prop(def);
      if (rotation) sprite.setAngle(rotation);
      this.itemLight(placed.itemId, sprite);
    }
  }

  /** placed items with ItemDef.light glow at night and follow their sprite (drag, move) */
  private itemLight(itemId: string, sprite: Phaser.GameObjects.Sprite) {
    const l = ITEM_CATALOG[itemId]?.light;
    if (!l) return null;
    const light = this.light({
      x: sprite.x,
      y: sprite.y,
      follow: sprite,
      color: l.color,
      radius: l.radius,
      flicker: l.flicker === true,
      disco: itemId === "disco_ball",
    });
    this.placedLights.set(sprite, light);
    return light;
  }

  private dropItemLight(sprite: Phaser.GameObjects.Sprite) {
    this.lighting.remove(this.placedLights.get(sprite));
    this.placedLights.delete(sprite);
  }

  private centerOf(gx: number, gy: number, w: number, h: number) {
    const r = PERSONAL_RECTS[0]!;
    return { x: t(r.x + gx + w / 2), y: t(r.y + gy + h / 2) };
  }

  private markTiles(gx: number, gy: number, w: number, h: number, blocked: boolean) {
    const r = PERSONAL_RECTS[0]!;
    for (let y = r.y + gy; y < r.y + gy + h; y++)
      for (let x = r.x + gx; x < r.x + gx + w; x++) {
        if (blocked) {
          if (this.grid[y]?.[x] === FLOOR) this.grid[y]![x] = BLOCKED;
        } else if (this.grid[y]?.[x] === BLOCKED) this.grid[y]![x] = FLOOR;
      }
  }

  /** creates exactly one sprite (+ collision zone / glow ring) and tracks it */
  private spawnPlaced(itemId: string, gx: number, gy: number, rotation: Rotation): number {
    const item = ITEM_CATALOG[itemId];
    if (!item) return -1;
    const f = effectiveFootprint(item, rotation);
    const c = this.centerOf(gx, gy, f.w, f.h);
    const sprite = this.add.sprite(c.x, c.y, item.textureKey).setDepth(c.y);
    const tint = this.moodTint(ROOMS[0]!, item);
    if (tint) sprite.setTint(tint);
    if (rotation) sprite.setAngle(rotation);
    this.myObjs.push(sprite);
    this.itemLight(itemId, sprite);

    let zone: Phaser.GameObjects.Zone | null = null;
    if (item.solid) {
      zone = this.add.zone(c.x, c.y, t(f.w) * 0.85, t(f.h) * 0.7);
      this.walls.add(zone);
      this.myObjs.push(zone);
      this.markTiles(gx, gy, f.w, f.h, true);
    }

    const payload = this.payloadFor(ROOMS[0]!, item);
    let ring: Phaser.GameObjects.Image | null = null;
    if (payload) {
      ring = this.add
        .image(c.x, c.y + 6, "glow")
        .setDepth(1)
        .setAlpha(0)
        .setScale(1.1)
        .setTint(0xf2d79a);
      this.myObjs.push(ring);
      this.interactives.push({ sprite, ring, payload });
      if (!this.editMode) {
        this.tweens.add({
          targets: sprite,
          y: c.y - 2,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: "Stepped",
          easeParams: [2],
        });
      }
    }

    this.placed.push({ sprite, zone, ring, itemId, gx, gy, rotation });
    return this.placed.length - 1;
  }

  private renderMyLayout(_room: PersonRoom, _rect: Rect) {
    this.myObjs = [];
    this.placed = [];
    for (const p of this.getMyLayout()) {
      this.spawnPlaced(p.itemId, p.gx, p.gy, (p.rotation ?? 0) as Rotation);
    }
    if (this.editMode) this.enableDragging();
  }

  /** re-read my layout from the store (dev tools can remove placed items) */
  reloadMyLayout() {
    this.rebuildMyRoom();
  }

  /** full teardown/rebuild — only used when leaving edit mode */
  private rebuildMyRoom() {
    this.clearSelection();
    for (const p of this.placed) this.dropItemLight(p.sprite);
    for (const o of this.myObjs) {
      if (o instanceof Phaser.GameObjects.Zone) this.walls.remove(o, true, true);
      else o.destroy();
    }
    this.myObjs = [];
    this.interactives = this.interactives.filter((i) => i.sprite.active);
    const rect = PERSONAL_RECTS[0]!;
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++)
        if (this.grid[y]![x] === BLOCKED) this.grid[y]![x] = FLOOR;
    this.renderMyLayout(ROOMS[0]!, rect);
  }

  // ---------- per-item operations ----------

  private addPlacedItem(itemId: string, gx: number, gy: number, rotation: Rotation = 0) {
    const idx = this.spawnPlaced(itemId, gx, gy, rotation);
    if (idx < 0) return false;
    const entry = this.placed[idx]!;
    this.makeDraggable(entry.sprite);
    sfx.placeItem();
    this.commitLayout();
    this.select(idx);
    return true;
  }

  private movePlacedItem(idx: number, gx: number, gy: number) {
    const entry = this.placed[idx];
    if (!entry) return;
    const item = ITEM_CATALOG[entry.itemId]!;
    const f = effectiveFootprint(item, entry.rotation);
    if (item.solid) this.markTiles(entry.gx, entry.gy, f.w, f.h, false);
    entry.gx = gx;
    entry.gy = gy;
    const c = this.centerOf(gx, gy, f.w, f.h);
    entry.sprite.setPosition(c.x, c.y).setDepth(c.y);
    entry.ring?.setPosition(c.x, c.y + 6);
    if (entry.zone) {
      entry.zone.setPosition(c.x, c.y);
      (entry.zone.body as Phaser.Physics.Arcade.StaticBody | undefined)?.updateFromGameObject();
      this.markTiles(gx, gy, f.w, f.h, true);
    }
  }

  private rotatePlacedItem(idx: number) {
    const entry = this.placed[idx];
    if (!entry) return;
    const item = ITEM_CATALOG[entry.itemId]!;
    if (isWallItem(item)) {
      this.flashReject(entry.sprite);
      return;
    }
    const next = ((entry.rotation + 90) % 360) as Rotation;
    if (!this.canPlace(entry.itemId, entry.gx, entry.gy, next, idx)) {
      this.flashReject(entry.sprite);
      return;
    }
    const old = effectiveFootprint(item, entry.rotation);
    if (item.solid) this.markTiles(entry.gx, entry.gy, old.w, old.h, false);
    entry.rotation = next;
    const f = effectiveFootprint(item, next);
    const c = this.centerOf(entry.gx, entry.gy, f.w, f.h);
    entry.sprite.setAngle(next).setPosition(c.x, c.y).setDepth(c.y);
    entry.ring?.setPosition(c.x, c.y + 6);
    if (entry.zone) {
      entry.zone.setPosition(c.x, c.y).setSize(t(f.w) * 0.85, t(f.h) * 0.7);
      (entry.zone.body as Phaser.Physics.Arcade.StaticBody | undefined)?.updateFromGameObject();
      this.markTiles(entry.gx, entry.gy, f.w, f.h, true);
    }
    sfx.uiClick();
    this.commitLayout();
  }

  private removePlacedItem(idx: number) {
    const entry = this.placed[idx];
    if (!entry) return;
    const item = ITEM_CATALOG[entry.itemId]!;
    const f = effectiveFootprint(item, entry.rotation);
    this.clearSelection();
    if (item.solid) this.markTiles(entry.gx, entry.gy, f.w, f.h, false);
    this.interactives = this.interactives.filter((i) => i.sprite !== entry.sprite);
    const dead = [entry.sprite, entry.ring, entry.zone].filter(Boolean) as Phaser.GameObjects.GameObject[];
    this.myObjs = this.myObjs.filter((o) => !dead.includes(o));
    if (entry.zone) this.walls.remove(entry.zone, true, true);
    entry.ring?.destroy();
    this.dropItemLight(entry.sprite);
    entry.sprite.destroy();
    this.placed.splice(idx, 1);
    sfx.removeItem();
    this.commitLayout();
  }

  private flashReject(sprite: Phaser.GameObjects.Sprite) {
    sprite.setTint(0xdd4444);
    this.time.delayedCall(150, () => {
      if (!sprite.active) return;
      const entry = this.placed.find((p) => p.sprite === sprite);
      const def = entry ? ITEM_CATALOG[entry.itemId] : undefined;
      const tint = def ? this.moodTint(ROOMS[0]!, def) : undefined;
      sprite.clearTint();
      if (tint) sprite.setTint(tint);
      if (entry && this.placed.indexOf(entry) === this.selectedIdx) sprite.setTint(0xfff3b0);
    });
  }

  private canPlace(
    itemId: string,
    gx: number,
    gy: number,
    rotation: Rotation = 0,
    ignoreIdx = -1,
  ) {
    const layout = this.placed.map((p) => ({ itemId: p.itemId, gx: p.gx, gy: p.gy, rotation: p.rotation }));
    return canPlaceIn(layout, itemId, gx, gy, rotation, ignoreIdx);
  }

  /** outlines the wall face or the floor, depending on where the item can go */
  private showMountGuide(itemId: string | null) {
    const item = itemId ? ITEM_CATALOG[itemId] : undefined;
    if (!item || !this.editMode) {
      this.mountGuide?.setVisible(false);
      return;
    }
    const r = PERSONAL_RECTS[0]!;
    if (!this.mountGuide)
      this.mountGuide = this.add
        .rectangle(0, 0, 10, 10, 0xffffff, 0)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xfaf0e0, 0.8)
        .setDepth(6300);
    const wall = isWallItem(item);
    this.mountGuide
      .setPosition(t(r.x) + 2, t(wall ? r.y : r.y + 1) + 2)
      .setSize(t(r.w) - 4, t(wall ? 1 : r.h - 1) - 4)
      .setVisible(true);
  }

  private currentLayout(): PlacedItem[] {
    return this.placed.map((p) => ({ itemId: p.itemId, gx: p.gx, gy: p.gy, rotation: p.rotation }));
  }

  private commitLayout() {
    this.onLayoutChange(this.currentLayout());
  }

  private makeDraggable(sprite: Phaser.GameObjects.Sprite) {
    sprite.setInteractive({ useHandCursor: true, draggable: true });
    sprite.off("pointerdown");
    sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.editMode || this.pendingPlaceItemId) return;
      pointer.event.stopPropagation();
      this.select(this.placed.findIndex((q) => q.sprite === sprite));
    });
  }

  private enableDragging() {
    for (const p of this.placed) this.makeDraggable(p.sprite);
  }

  private disableDragging() {
    for (const p of this.placed) {
      this.input.setDraggable(p.sprite, false);
      p.sprite.off("pointerdown");
      p.sprite.disableInteractive();
    }
  }

  setEditMode(on: boolean) {
    if (this.editMode === on) return;
    this.editMode = on;
    this.target = null;
    this.path = [];
    if (on) {
      this.activePayload = null;
      this.onPopup(null);
      this.enableDragging();
    } else {
      this.cancelPlacing();
      this.disableDragging();
      this.clearSelection();
      this.commitLayout();
      this.rebuildMyRoom();
    }
  }

  // ---------- selection ----------

  private clearSelection() {
    if (!this.pendingPlaceItemId) this.showMountGuide(null);
    if (this.selectedIdx >= 0) {
      const entry = this.placed[this.selectedIdx];
      if (entry?.sprite.active) {
        entry.sprite.clearTint();
        const def = ITEM_CATALOG[entry.itemId];
        const tint = def ? this.moodTint(ROOMS[0]!, def) : undefined;
        if (tint) entry.sprite.setTint(tint);
      }
    }
    this.selectedIdx = -1;
    this.selectionUi?.destroy();
    this.selectionUi = null;
  }

  private iconButton(label: string, fill: number, onTap: () => void) {
    const bg = this.add.rectangle(0, 0, 22, 22, fill, 1).setStrokeStyle(2, 0x241c26);
    const icon = this.add
      .text(0, 0, label, {
        fontFamily: '"Pixelify Sans", sans-serif',
        fontSize: "13px",
        color: "#fff6e8",
      })
      .setOrigin(0.5);
    const c = this.add
      .container(0, 0, [bg, icon])
      .setSize(22, 22)
      .setInteractive({ useHandCursor: true });
    c.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onTap();
    });
    return c;
  }

  private select(idx: number) {
    this.clearSelection();
    const p = this.placed[idx];
    if (!p) return;
    this.selectedIdx = idx;
    this.showMountGuide(p.itemId);
    p.sprite.setTint(0xfff3b0);
    const remove = this.iconButton("X", 0x9b2f2f, () => this.removeSelected());
    const def = ITEM_CATALOG[p.itemId];
    const buttons: Phaser.GameObjects.Container[] = [remove];
    if (def && !isWallItem(def)) {
      // wall items never rotate, so they get only the remove button
      const rotate = this.iconButton("\u21BB", 0x3f6f7a, () => this.rotatePlacedItem(this.selectedIdx));
      remove.setPosition(14, 0);
      rotate.setPosition(-14, 0);
      buttons.unshift(rotate);
    }
    this.selectionUi = this.add.container(p.sprite.x, 0, buttons).setDepth(5000);
    this.positionSelectionUi();
  }

  private positionSelectionUi() {
    const entry = this.placed[this.selectedIdx];
    if (!this.selectionUi || !entry?.sprite.active) return;
    const s = entry.sprite;
    const halfH = (s.angle % 180 === 0 ? s.displayHeight : s.displayWidth) / 2;
    this.selectionUi.setPosition(s.x, s.y - halfH - 16);
  }

  private removeSelected() {
    if (this.selectedIdx >= 0) this.removePlacedItem(this.selectedIdx);
  }

  // ---------- tap-to-place ----------

  /** starts (or toggles off) placing mode for a tray item */
  togglePlacing(itemId: string) {
    if (this.pendingPlaceItemId === itemId) {
      this.cancelPlacing();
      return;
    }
    if (!ITEM_CATALOG[itemId]) return;
    this.clearSelection();
    this.pendingPlaceItemId = itemId;
    this.onPlacingChange(itemId);
    this.showMountGuide(itemId);
    const item = ITEM_CATALOG[itemId]!;
    this.ghost?.destroy();
    this.ghost = this.add.sprite(-999, -999, item.textureKey).setAlpha(0.6).setDepth(6500);
    const ghostTint = this.moodTint(ROOMS[0]!, item);
    if (ghostTint) this.ghost.setTint(ghostTint);
    this.ensureHighlight();
    this.updatePlacingPreview(this.input.activePointer);
  }

  cancelPlacing() {
    if (!this.pendingPlaceItemId) return;
    this.pendingPlaceItemId = null;
    this.onPlacingChange(null);
    this.showMountGuide(null);
    this.ghost?.destroy();
    this.ghost = null;
    this.highlight?.setVisible(false);
  }

  private ensureHighlight() {
    if (!this.highlight) {
      this.highlight = this.add
        .rectangle(0, 0, TILE, TILE, 0x6fbf73, 0.3)
        .setStrokeStyle(2, 0x6fbf73)
        .setDepth(6400)
        .setOrigin(0.5);
    }
    this.highlight.setVisible(true);
  }

  /** tile under the pointer for a footprint of w x h, room-relative */
  private tileUnderPointer(p: Phaser.Input.Pointer, w: number, h: number) {
    const rect = PERSONAL_RECTS[0]!;
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    return {
      gx: Math.round(wp.x / TILE - w / 2) - rect.x,
      gy: Math.round(wp.y / TILE - h / 2) - rect.y,
    };
  }

  private paintHighlight(gx: number, gy: number, w: number, h: number, ok: boolean) {
    this.ensureHighlight();
    const c = this.centerOf(gx, gy, w, h);
    const color = ok ? 0x6fbf73 : 0xdd4444;
    this.highlight!
      .setPosition(c.x, c.y)
      .setSize(t(w), t(h))
      .setFillStyle(color, 0.28)
      .setStrokeStyle(2, color);
  }

  private updatePlacingPreview(p: Phaser.Input.Pointer) {
    const itemId = this.pendingPlaceItemId;
    if (!itemId || !this.ghost) return;
    const item = ITEM_CATALOG[itemId]!;
    const f = effectiveFootprint(item, 0);
    const { gx, gy } = this.tileUnderPointer(p, f.w, f.h);
    const c = this.centerOf(gx, gy, f.w, f.h);
    this.ghost.setPosition(c.x, c.y);
    const ok = this.canPlace(itemId, gx, gy, 0);
    this.ghost.setTint(ok ? 0xffffff : 0xdd4444);
    this.paintHighlight(gx, gy, f.w, f.h, ok);
  }

  /** tap on the room while in placing mode */
  private tryPlaceAtPointer(p: Phaser.Input.Pointer) {
    const itemId = this.pendingPlaceItemId;
    if (!itemId) return;
    const item = ITEM_CATALOG[itemId]!;
    const f = effectiveFootprint(item, 0);
    const { gx, gy } = this.tileUnderPointer(p, f.w, f.h);
    if (!this.canPlace(itemId, gx, gy, 0)) {
      // stay in placing mode so the next tap can try again
      this.ghost?.setTint(0xdd4444);
      return;
    }
    this.cancelPlacing();
    this.addPlacedItem(itemId, gx, gy, 0);
  }

  /** desktop HTML5-drag drop from the tray, or a coordinate-free fallback */
  placeFromTray(itemId: string, screen?: { x: number; y: number }) {
    const rect = PERSONAL_RECTS[0]!;
    const item = ITEM_CATALOG[itemId];
    if (!item) return false;
    const f = effectiveFootprint(item, 0);
    let spot: { gx: number; gy: number } | null = null;
    if (screen) {
      const wp = this.cameras.main.getWorldPoint(screen.x, screen.y);
      const gx = Math.round(wp.x / TILE - f.w / 2) - rect.x;
      const gy = Math.round(wp.y / TILE - f.h / 2) - rect.y;
      if (this.canPlace(itemId, gx, gy, 0)) spot = { gx, gy };
    }
    if (!spot)
      for (let gy = 0; gy < rect.h && !spot; gy++)
        for (let gx = 0; gx < rect.w && !spot; gx++)
          if (this.canPlace(itemId, gx, gy, 0)) spot = { gx, gy };
    if (!spot) return false;
    this.cancelPlacing();
    return this.addPlacedItem(itemId, spot.gx, spot.gy, 0);
  }

  /** Escape backs out of whatever is live */
  escape() {
    if (this.pendingPlaceItemId) this.cancelPlacing();
    else if (this.selectedIdx >= 0) this.clearSelection();
  }

  private setupEditorInput() {
    this.input.keyboard?.on("keydown-ESC", () => this.escape());

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.editMode) return;
      if (this.pendingPlaceItemId) this.updatePlacingPreview(p);
    });

    this.input.on("dragstart", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite) => {
      this.tweens.killTweensOf(obj);
      if (!this.editMode || this.pendingPlaceItemId) return;
      obj.setDepth(6000);
      this.select(this.placed.findIndex((p) => p.sprite === obj));
    });

    this.input.on(
      "drag",
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite, dx: number, dy: number) => {
        if (!this.editMode) return;
        const rect = PERSONAL_RECTS[0]!;
        const idx = this.placed.findIndex((p) => p.sprite === obj);
        const entry = this.placed[idx];
        if (!entry) return;
        const item = ITEM_CATALOG[entry.itemId]!;
        const f = effectiveFootprint(item, entry.rotation);
        const halfW = t(f.w) / 2;
        const halfH = t(f.h) / 2;
        const cx = Phaser.Math.Clamp(dx, t(rect.x) + halfW, t(rect.x + rect.w) - halfW);
        const cy = Phaser.Math.Clamp(dy, t(rect.y) + halfH, t(rect.y + rect.h) - halfH);
        obj.setPosition(cx, cy);
        const gx = Math.round(cx / TILE - f.w / 2) - rect.x;
        const gy = Math.round(cy / TILE - f.h / 2) - rect.y;
        this.paintHighlight(gx, gy, f.w, f.h, this.canPlace(entry.itemId, gx, gy, entry.rotation, idx));
      },
    );

    this.input.on("dragend", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Sprite) => {
      if (!this.editMode) return;
      this.highlight?.setVisible(false);
      const rect = PERSONAL_RECTS[0]!;
      const idx = this.placed.findIndex((p) => p.sprite === obj);
      const entry = this.placed[idx];
      if (!entry) return;
      const item = ITEM_CATALOG[entry.itemId]!;
      const f = effectiveFootprint(item, entry.rotation);
      const gx = Math.round(obj.x / TILE - f.w / 2) - rect.x;
      const gy = Math.round(obj.y / TILE - f.h / 2) - rect.y;
      if (this.canPlace(entry.itemId, gx, gy, entry.rotation, idx)) {
        this.movePlacedItem(idx, gx, gy);
        sfx.placeItem();
        this.commitLayout();
      } else {
        this.flashReject(obj);
        // snap back to the last committed position without rebuilding the room
        const c = this.centerOf(entry.gx, entry.gy, f.w, f.h);
        obj.setPosition(c.x, c.y).setDepth(c.y);
      }
    });
  }


  /** raw source canvas of a generated texture — the shop tints these into per-item thumbnails */
  getTextureSource(key: string): HTMLCanvasElement | HTMLImageElement | null {
    if (!this.textures.exists(key)) return null;
    const src = this.textures.get(key).getSourceImage(0);
    return src instanceof HTMLCanvasElement || src instanceof HTMLImageElement ? src : null;
  }

  /** data-url thumbnail for a generated texture — used by the shop/tray UI */
  getTextureDataUrl(key: string): string | null {
    if (!this.textures.exists(key)) return null;
    const src = this.textures.get(key).getSourceImage(0) as HTMLCanvasElement;
    return typeof src?.toDataURL === "function" ? src.toDataURL() : null;
  }

  /** drifting music notes — reuses one shared texture */
  private spawnSoundCue(x: number, y: number, tint: number) {
    for (let i = 0; i < 3; i++) {
      const note = this.add
        .image(x, y, "note")
        .setTint(tint)
        .setDepth(7)
        .setScale(0.55)
        .setAlpha(0);
      // rise, drift sideways, fade out — a continuous loop, never a static icon
      this.tweens.add({
        targets: note,
        y: y - 52,
        x: x + (i % 2 === 0 ? 18 : -16),
        scale: 1,
        angle: i % 2 === 0 ? 14 : -14,
        alpha: { from: 0.95, to: 0 },
        duration: 2400,
        delay: i * 780,
        repeat: -1,
        ease: "Sine.easeOut",
      });
    }
  }


  private decorate(zones: Zone[]) {
    // personal rooms (generic from data)
    const doorXs = [11, 32, 53];
    ROOMS.forEach((room, i) =>
      this.buildPersonalRoom(room, PERSONAL_RECTS[i]!, doorXs[i]!, i === 0),
    );

    // zone labels
    // dorm-door signs in the hallway, just above each common room's doorway
    for (const z of COMMON) {
      if (z.kind !== "common") continue;
      const door = DOORWAYS.filter(([dx, dy]) => dy === z.y - 1 && dx >= z.x && dx < z.x + z.w).map(([dx]) => dx);
      const cx = door.length ? t(Math.min(...door) + door.length / 2) : t(z.x + z.w / 2);
      this.label(cx, t(z.y - 1) - 12, z.label, "#3a2f34", 12).setDepth(5);
    }
    // wayfinding: a dark painted plaque on the hall's back-wall face
    this.wallSign(t(4), t(17), ["FLOOR 3"], "dark", "center");

    // ---- Common Lounge ----
    // Composition rules for every shared room: wall decor on the face (row 0),
    // tall furniture flush against it, only seating/tables/rugs/foosball in open floor,
    // the door lane kept clear, seating faces what it's for, no overlapping sprites.
    // SOLIDITY RULE: floor-standing furniture you couldn't walk through is solid: true.
    const L = COMMON[0]!;
    const lx = (n: number) => t(L.x + n);
    const ly = (n: number) => t(L.y + n);

    // wall face
    this.add.image(lx(1.6), ly(0.05), "poster-film").setTint(0xc7cfd8).setScale(0.62).setDepth(4);
    this.add.image(lx(14.4), ly(-0.05), "poster-band").setTint(0xe2b7a4).setScale(0.62).setDepth(4);
    this.add.image(lx(11.6), ly(-0.1), "neon").setDepth(4);
    this.light({ x: lx(11.6), y: ly(-0.1), color: 0xff5fa8, radius: 60 });
    // string lights along the top face row, skipping the doorway span — small bulbs on a sagging wire
    {
      const wire = this.add.graphics().setDepth(4);
      wire.fillStyle(0x241c26, 1);
      let prev: { x: number; y: number } | null = null;
      for (let i = 0, sx = lx(0.4); sx < lx(L.w - 0.3); i++, sx += 14) {
        if (sx > lx(6.8) && sx < lx(9.2)) {
          prev = null;
          continue;
        }
        const by = Math.round(ly(-0.62) + (i % 2 === 0 ? -2 : 2));
        if (prev) {
          // 1px wire with a ~3px sag in the middle
          for (let x = prev.x; x <= sx; x++) {
            const f = (x - prev.x) / (sx - prev.x);
            const y = prev.y + (by - prev.y) * f + Math.sin(f * Math.PI) * 3;
            wire.fillRect(x, Math.round(y) - 3, 1, 1);
          }
        }
        prev = { x: sx, y: by };
        this.add.image(sx, by, "sparkle").setTint(0xffe3a6).setScale(0.5).setDepth(4.1);
        this.light({ x: sx, y: by, color: 0xffe3a6, radius: 14, twinkle: i * 233, strength: 0.22 });
      }
    }

    // left: the TV pit — everything faces the TV
    this.add.image(lx(3.3), ly(5.1), "rug").setTint(0xbfae97).setScale(1.25, 1.2).setDepth(1);
    this.prop({ key: "tv", x: lx(3.3), y: ly(1.6), solid: true });
    this.light({ x: lx(3.3), y: ly(1.6), color: 0x8fb8ff, radius: 50, flicker: true });
    // console on the floor in front of the TV's right side — clear of the TV and the door plant
    this.prop({ key: "console", x: lx(4.6), y: ly(3.1), solid: true });
    this.prop({ key: "record", x: lx(0.95), y: ly(1.6), solid: true });
    this.prop({
      key: "table",
      x: lx(3.3),
      y: ly(4.3),
      solid: true,
      payload: { kind: "flavor", ...FLAVOR_PROPS.lounge },
    });
    this.prop({ key: "controller", x: lx(2.8), y: ly(4.0), depthBias: 20 });
    this.prop({ key: "controller", x: lx(3.9), y: ly(4.05), depthBias: 20 });
    this.prop({ key: "couch-back", x: lx(3.3), y: ly(6.6), tint: 0xd9a27e, solid: true });
    this.prop({ key: "beanbag", x: lx(1.0), y: ly(4.4), tint: 0xd98a6c });
    this.prop({ key: "beanbag", x: lx(5.6), y: ly(4.4), tint: 0xd8b25c });
    this.prop({ key: "lamp", x: lx(0.65), y: ly(8.3) });
    this.light({ x: lx(0.65), y: ly(8.3) - 30, color: 0xffd9a0, radius: 60 });
    // party-light flecks: slow drifting, fading spots of colored light across the rug
    const fleckColors = [0xf07ab8, 0x7fd1e8, 0xf2d06b, 0x9be39b];
    for (let i = 0; i < 6; i++) {
      const f = this.add
        .rectangle(lx(1.9 + (i % 3) * 1.4), ly(4.9 + Math.floor(i / 3) * 1.2), 6, 6, fleckColors[i % 4]!, 0)
        .setDepth(1.5);
      const drift = () => {
        const ox = lx(1.4 + Math.random() * 3.8);
        const oy = ly(4.6 + Math.random() * 1.6);
        f.setPosition(ox, oy).setFillStyle(fleckColors[Math.floor(Math.random() * 4)]!, 1);
        f.setAlpha(0);
        this.tweens.add({
          targets: f,
          x: ox + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30),
          y: oy + (Math.random() - 0.5) * 20,
          duration: 3200 + Math.random() * 1600,
          ease: "Sine.easeInOut",
          onComplete: drift,
        });
        this.tweens.add({
          targets: f,
          alpha: { from: 0, to: 0.85 },
          duration: 1400,
          yoyo: true,
          hold: 500,
          ease: "Sine.easeInOut",
        });
      };
      this.time.delayedCall(i * 650, drift);
    }

    // center: the doorway, framed by plants — nothing else in cols 7–8
    this.prop({ key: "plant", x: lx(6.3), y: ly(1.4) });
    this.prop({ key: "plant", x: lx(9.7), y: ly(1.4) });

    // right: the games corner
    this.prop({ key: "arcade", x: lx(11.22), y: ly(1.7), solid: true });
    this.prop({ key: "arcade", x: lx(12.85), y: ly(1.7), tint: 0xd7b8e8, solid: true });
    this.light({ x: lx(11.22), y: ly(1.4), color: 0x6fe0d0, radius: 40 });
    this.light({ x: lx(12.85), y: ly(1.4), color: 0xb98cff, radius: 40 });
    this.prop({ key: "foosball", x: lx(12.6), y: ly(4.8), solid: true });
    this.prop({ key: "papasan", x: lx(11.2), y: ly(7.9), solid: true });
    this.prop({ key: "beanbag", x: lx(13.6), y: ly(8.1), tint: 0x74a8ab });
    this.prop({ key: "fridge", x: lx(14.9), y: ly(2.0), scale: 0.8, tint: 0xb8c8cf, solid: true });
    this.prop({ key: "plant", x: lx(15.3), y: ly(8.4) });

    // ---- Study Lounge ---- (door at local cols 6–7, kept clear)
    const S = COMMON[1]!;
    this.prop({ key: "desk", x: t(S.x + 1.5), y: t(S.y + 1.7), solid: true });
    this.prop({ key: "desk", x: t(S.x + 4.5), y: t(S.y + 1.7), solid: true });
    this.prop({ key: "lamp", x: t(S.x + 13.3), y: t(S.y + 1.5) });
    this.light({ x: t(S.x + 13.3), y: t(S.y + 1.5) - 30, color: 0xffd9a0, radius: 60 });
    this.prop({
      key: "shelf",
      x: t(S.x + 9.4),
      y: t(S.y + 1.8),
      payload: { kind: "flavor", ...FLAVOR_PROPS.study },
      solid: true,
    });
    this.prop({ key: "vinylcrate", x: t(S.x + 11.6), y: t(S.y + 1.75), solid: true });
    // quiet reading nook, lower right; lower-left left open on purpose
    this.add.image(t(S.x + 10.6), t(S.y + 7.2), "rug").setTint(0x9fb3c8).setScale(0.7).setDepth(1);
    this.prop({ key: "cushions", x: t(S.x + 10.4), y: t(S.y + 7.3) });
    this.prop({ key: "plant", x: t(S.x + 13.3), y: t(S.y + 8.5) });

    // ---- Kitchenette ---- (door at local cols 5–6, kept clear)
    const K = COMMON[2]!;
    this.prop({
      key: "fridge",
      x: t(K.x + 0.88),
      y: t(K.y + 1.7),
      scale: 0.9,
      payload: { kind: "flavor", ...FLAVOR_PROPS.kitchen },
      solid: true,
    });
    this.prop({ key: "counter", x: t(K.x + 3.38), y: t(K.y + 1.7), scale: 0.95, solid: true });
    // under-cabinet strip so the kitchenette isn't a black box at night
    this.light({ x: t(K.x + 3.38), y: t(K.y + 1.6), color: 0xffe3b0, radius: 44 });
    this.add.image(t(K.x + 8.4), t(K.y), "snackshelf").setDepth(4);
    this.add.image(t(K.x + 10.6), t(K.y + 0.05), "poster").setTint(0xe6d7a8).setScale(0.55).setDepth(4);
    // eating nook, centered in the open floor (door lane cols 5–6 stays clear)
    this.add.image(t(K.x + 8.4), t(K.y + 5.6), "rug").setTint(0xe0b48a).setScale(0.85, 0.8).setDepth(1);
    this.prop({ key: "table", x: t(K.x + 8.4), y: t(K.y + 5.6), solid: true });
    this.prop({ key: "beanbag", x: t(K.x + 7.2) - 22, y: t(K.y + 5.7), tint: 0xd98a6c, scale: 0.85 });
    this.prop({ key: "beanbag", x: t(K.x + 9.6) + 22, y: t(K.y + 5.7), tint: 0x9fc3a0, scale: 0.85 });
    // pantry corner, bottom-left
    this.prop({ key: "crate", x: t(K.x + 0.9), y: t(K.y + 8.3), scale: 0.8, solid: true });
    this.prop({ key: "crate", x: t(K.x + 0.9), y: t(K.y + 8.3) - 18, scale: 0.7, depthBias: 4 });
    this.prop({ key: "bin", x: t(K.x + 1.8) + 8, y: t(K.y + 8.6), tint: 0x7fa58a });
    this.prop({ key: "plant", x: t(K.x + 11.3), y: t(K.y + 8.5), scale: 0.9 });

    // ---- Courtyard ----
    const C = COMMON[3]!;
    this.prop({ key: "tree", x: t(C.x + 3), y: t(C.y + 3.4), solid: true });
    this.prop({ key: "tree", x: t(C.x + 12.6), y: t(C.y + 16.6), scale: 0.85, solid: true });
    this.prop({
      key: "bench",
      x: t(C.x + 6.6),
      y: t(C.y + 11.6),
      payload: { kind: "flavor", ...FLAVOR_PROPS.courtyard },
    });
    this.prop({ key: "bench", x: t(C.x + 11.2), y: t(C.y + 6.2), scale: 0.95 });
    this.prop({ key: "plant", x: t(C.x + 2), y: t(C.y + 17.6) });
    this.prop({ key: "plant", x: t(C.x + 13.6), y: t(C.y + 3.2), scale: 1.1 });
    // string lights across the courtyard
    for (let i = 0; i < 16; i++) {
      const lx = t(C.x + 0.6) + i * 30;
      const ly = t(C.y + 1) + Math.sin(i * 0.9) * 7;
      if (lx > t(C.x + C.w)) break;
      this.add.image(lx, ly, "sparkle").setTint(0xffe9a8).setDepth(2);
      this.light({ x: lx, y: ly, color: 0xffe3a6, radius: 14, twinkle: i * 311, strength: 0.26 });
    }


    // ---- hallway shared props ----
    // Rows 16–17 are the hall's back-wall face (face centre = t(17)); walkable floor is rows 18–21.
    // Wall decor hangs on the face; floor pieces stand on row 18+ with their tops overlapping it.
    const faceMid = t(HALL.y);
    const standOn = (h: number, foot = 22) => t(HALL.y + 1) + foot - h / 2; // bottom lands on row 18

    this.prop({
      key: "board",
      x: t(24),
      y: faceMid,
      scale: 1.15,
      payload: { kind: "corkboard" },
      label: COMMUNITY_CORKBOARD.title,
    });

    this.prop({
      key: "vending",
      x: t(46),
      y: standOn(98, 20),
      payload: { kind: "flavor", ...FLAVOR_PROPS.vending },
      solid: true,
    });
    this.light({ x: t(46), y: standOn(98, 20), color: 0xdff3ff, radius: 50 });
    this.prop({
      key: "crate",
      x: t(8),
      y: standOn(52),
      payload: { kind: "flavor", ...FLAVOR_PROPS.lostFound },
    });
    // a crate alone is ambiguous, so this one keeps a sign — on the wall above it
    this.wallSign(t(8), t(16) + 20, ["LOST & FOUND"], "cream", "center");

    // locked "more rooms coming" door set into the corridor's back wall, sill on the baseboard
    this.prop({
      key: "lockdoor",
      x: t(64.5),
      y: t(HALL.y + 1) - 32,
      scale: 0.68,
      payload: { kind: "flavor", ...FLAVOR_PROPS.locked },
    }).setAlpha(0.75);

    // club flyers / lost-pet posters taped mid-face, slightly staggered
    const flyers: Array<[number, number, string, number]> = [
      // hallway decor never goes on row 22 — that wall's visible side belongs to the rooms below
      [20, 16.85, "flyer-a", 0xfffdf5],
      [21.5, 17.15, "flyer-b", 0xfaf4e4],
      [27.5, 16.9, "flyer-b", 0xf0ecdc],
      [41.5, 16.85, "flyer-a", 0xf3ecd8],
      [43.5, 17.1, "flyer-c", 0xfdf3ea],
      [61, 17.0, "flyer-d", 0xf6f0dd],
    ];
    for (const [fx, fy, key, tint] of flyers)
      this.add.image(t(fx), t(fy), key).setTint(tint).setDepth(4);

    // a bike standing on row 18, leaning against the corridor wall (clear of Jordan's nameplate)
    this.prop({ key: "bike", x: t(49.5), y: standOn(60) });

    // warm floor lamp lighting an otherwise empty stretch of corridor (clear of Sam's nameplate)
    const lampX = t(37.9);
    this.prop({ key: "lamp", x: lampX, y: standOn(88, 24) });
    this.add
      .image(lampX, t(HALL.y + 1) + 20, "glow")
      .setTint(0xffdca0)
      .setAlpha(0.3)
      .setScale(1.8)
      .setDepth(1);
    this.light({ x: lampX, y: standOn(88, 24) - 30, color: 0xffd9a0, radius: 70 });

    // recycling + trash pair
    this.prop({ key: "bin", x: t(40), y: standOn(38, 20), tint: 0x7f9ec4 });
    this.prop({ key: "bin", x: t(40.9), y: standOn(38, 24) });

    // mail cubbies on the hallway wall
    this.prop({
      key: "cubby",
      x: t(30),
      y: faceMid,
      payload: { kind: "flavor", title: "Mail Cubbies", lines: ["Someone's Amazon package again", "One postcard from 2019"] },
    });

    void zones;
  }

  // ---------- player ----------

  private spawnPlayer() {
    this.player = this.physics.add
      .sprite(t(12) + 16, t(19) + 16, "char-down-0")
      .setDepth(1000);
    this.player.setScale(1.1);
    this.player.setOrigin(0.5, 0.85);
    this.player.body!.setSize(18, 11);
    this.player.body!.setOffset(7, 30);
    this.physics.add.collider(this.player, this.walls);
    this.physics.world.setBounds(0, 0, GRID_W * TILE, GRID_H * TILE);
    this.player.setCollideWorldBounds(true);
  }


  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GRID_W * TILE, GRID_H * TILE);
    cam.setBackgroundColor(EXT_GROUND);
    cam.startFollow(this.player, true, 0.16, 0.16);
    cam.setZoom(1.6);
  }

  /** edit mode: fit Your Room (wall face included) into the area above the tray */
  frameMyRoom(bottomInsetPx: number) {
    const cam = this.cameras.main;
    const r = PERSONAL_RECTS[0]!;
    const x0 = t(r.x - 1);
    const y0 = t(r.y - 1);
    const w = t(r.w + 2);
    const h = t(r.h + 2);
    const visH = Math.max(120, cam.height - bottomInsetPx - 12);
    const zoom = Math.min(cam.width / w, visH / h) * 0.96;
    cam.stopFollow();
    cam.removeBounds();
    cam.setZoom(zoom);
    // shift the center down so the room sits in the visible band above the tray
    cam.centerOn(x0 + w / 2, y0 + h / 2 + bottomInsetPx / (2 * zoom));
  }

  restoreCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GRID_W * TILE, GRID_H * TILE);
    cam.setZoom(1.6);
    cam.startFollow(this.player, true, 0.16, 0.16);
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    kb.on("keydown", () => unlockAudio());
    this.keys = kb.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      unlockAudio();
      if (this.editMode) {
        if (this.pendingPlaceItemId) {
          this.tryPlaceAtPointer(p);
          return;
        }
        // tapping empty floor deselects; tapping an item or a control is handled elsewhere
        const wp0 = this.cameras.main.getWorldPoint(p.x, p.y);
        // tapping my room's wall opens the wallpaper picker, Animal Crossing style
        const wtx = Math.floor(wp0.x / TILE);
        const wty = Math.floor(wp0.y / TILE);
        const onItem = this.placed.some((q) => q.sprite.getBounds().contains(wp0.x, wp0.y));
        if (!onItem && this.myWallTiles().some(([mx, my]) => mx === wtx && my === wty)) {
          this.clearSelection();
          this.onWallTap();
          return;
        }
        const hitItem = this.placed.some((q) => q.sprite.getBounds().contains(wp0.x, wp0.y));
        const ub = this.selectionUi?.getBounds();
        const hitUi = !!ub && ub.contains(wp0.x, wp0.y);
        if (!hitItem && !hitUi) this.clearSelection();
        return;
      }

      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      const tx = Math.floor(wp.x / TILE);
      const ty = Math.floor(wp.y / TILE);
      if (this.grid[ty]?.[tx] !== FLOOR) return;
      this.path = this.findPath(
        Math.floor(this.player.x / TILE),
        Math.floor(this.player.y / TILE),
        tx,
        ty,
      );
      this.target = this.path.shift() ?? null;
    });
  }

  /** BFS over walkable tiles — cheap on an 80x40 grid and never walks through walls. */
  private findPath(sx: number, sy: number, gx: number, gy: number): Phaser.Math.Vector2[] {
    const key = (x: number, y: number) => y * GRID_W + x;
    const prev = new Map<number, number>();
    const seen = new Set<number>([key(sx, sy)]);
    const queue: Array<[number, number]> = [[sx, sy]];
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let found = false;
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (x === gx && y === gy) {
        found = true;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.grid[ny]?.[nx] !== FLOOR) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, key(x, y));
        queue.push([nx, ny]);
      }
    }
    if (!found) return [];
    const out: Phaser.Math.Vector2[] = [];
    let cur = key(gx, gy);
    while (cur !== key(sx, sy)) {
      out.unshift(
        new Phaser.Math.Vector2((cur % GRID_W) * TILE + TILE / 2, Math.floor(cur / GRID_W) * TILE + TILE / 2),
      );
      const p = prev.get(cur);
      if (p === undefined) break;
      cur = p;
    }
    return out;
  }

  override update(_time: number, delta: number) {
    const SPEED = 170;
    const body = this.player;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.keys["A"]!.isDown;
    const right = this.cursors.right.isDown || this.keys["D"]!.isDown;
    const up = this.cursors.up.isDown || this.keys["W"]!.isDown;
    const down = this.cursors.down.isDown || this.keys["S"]!.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1; // up key => move up the screen
    if (down) vy += 1;

    if (vx !== 0 || vy !== 0) {
      this.target = null; // keyboard cancels click path
      this.path = [];
      this.stuckMs = 0;
    } else if (this.target) {
      const d = Phaser.Math.Distance.Between(body.x, body.y, this.target.x, this.target.y);
      if (d < 8) {
        this.target = this.path.shift() ?? null;
      }
      if (this.target) {
        const ang = Phaser.Math.Angle.Between(body.x, body.y, this.target.x, this.target.y);
        vx = Math.cos(ang);
        vy = Math.sin(ang);
        const stalled =
          Math.abs(body.body!.velocity.x) < 8 && Math.abs(body.body!.velocity.y) < 8;
        this.stuckMs = stalled ? this.stuckMs + delta : 0;
        if (this.stuckMs > 450) {
          this.target = null;
          this.path = [];
          this.stuckMs = 0;
        }
      }
    }


    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) v.normalize().scale(SPEED);
    body.setVelocity(v.x, v.y);

    // facing + walk animation
    const moving = v.lengthSq() > 1;
    if (moving) {
      if (Math.abs(v.x) > Math.abs(v.y)) this.facing = v.x > 0 ? "right" : "left";
      else this.facing = v.y > 0 ? "down" : "up";
      this.walkTime += delta;
    } else {
      this.walkTime = 0;
    }
    const step = moving ? (Math.floor(this.walkTime / 150) % 2 === 0 ? 1 : 2) : 0;
    if (moving && step !== this.lastStep) sfx.footstep();
    this.lastStep = step;
    const key = `char-${this.facing}-${step}`;
    if (this.player.texture.key !== key) this.player.setTexture(key);

    if (!this.editMode) this.checkProximity();
    if (this.editMode && this.selectedIdx >= 0) this.positionSelectionUi();

    if (_time >= this.nextPhaseCheck) {
      this.nextPhaseCheck = _time + 60_000;
      this.refreshPhase();
    }
    this.lighting.update(_time);

    this.trackMyRoom();
  }

  /** tells React whether the player is standing in their own room */
  private trackMyRoom() {
    const r = PERSONAL_RECTS[0]!;
    const tx = this.player.x / TILE;
    const ty = this.player.y / TILE;
    const inside = tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h;
    if (inside !== this.insideMyRoom) {
      this.insideMyRoom = inside;
      this.onInsideRoom(inside);
    }
  }

  private checkProximity() {
    const HOVER = 110;
    const OPEN = 70;
    let best: { payload: PopupPayload; d: number } | null = null;
    for (const it of this.interactives) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.sprite.x, it.sprite.y + 8);
      const hovering = d < HOVER;
      const targetAlpha = hovering ? Phaser.Math.Clamp(1 - d / HOVER, 0.15, 0.7) : 0;
      it.ring.setAlpha(Phaser.Math.Linear(it.ring.alpha, targetAlpha, 0.15));
      it.ring.setScale(Phaser.Math.Linear(it.ring.scaleX, hovering && d < OPEN + 20 ? 0.95 : 0.75, 0.12));
      if (d < OPEN && (!best || d < best.d)) best = { payload: it.payload, d };
    }
    const next = best?.payload ?? null;
    if (next !== this.activePayload) {
      if (next && !this.activePayload) sfx.popupOpen();
      this.activePayload = next;
      this.onPopup(next);
    }
  }
}
