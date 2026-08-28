import * as Phaser from "phaser";
import {
  COMMUNITY_CORKBOARD,
  FLAVOR_PROPS,
  MOODS,
  ROOMS,
  type PersonRoom,
  type PlacedItem,
  type PopupPayload,
} from "@/data/dorm";
import { ITEM_CATALOG } from "@/data/items";
import { buildTextures } from "./textures";

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

const HALL: Zone = {
  id: "hall",
  label: "Hallway",
  x: 2,
  y: 17,
  w: 66,
  h: 5,
  floor: 0xc9b59b,
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
  private onPopup: (p: PopupPayload | null) => void = () => {};
  private grid: number[][] = [];

  constructor() {
    super("dorm");
  }

  init(data: { onPopup?: (p: PopupPayload | null) => void }) {
    if (data?.onPopup) this.onPopup = data.onPopup;
  }

  preload() {
    buildTextures(this);
  }

  create() {
    const zones = this.buildZones();
    this.buildGrid(zones);
    this.paintFloor(zones);
    this.buildColliders();
    this.decorate(zones);
    this.spawnPlayer();
    this.setupCamera();
    this.setupInput();
  }

  // ---------- world ----------

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
          // commercial fleck carpet: mottled tufts, no plank grain
          const seed = Math.abs((tx * 73856093) ^ (ty * 19349663));
          const tones = [dark, darker, light, mix(z.floor, 0x6b5748, 0.16)];
          for (let i = 0; i < 26; i++) {
            const sx = Math.abs((seed >> (i % 11)) * (i + 3)) % U;
            const sy = Math.abs((seed >> ((i % 7) + 2)) * (i + 5)) % U;
            const tone = tones[(seed + i) % tones.length]!;
            px(ox + sx, oy + sy, 1 + ((seed + i) % 2), 1, tone);
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

  private paintFloor(zones: Zone[]) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (const z of zones) this.paintZoneFloor(g, z);

    // ---- walls: flat 3-tone pixel bands, hard edges ----
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.grid[y]![x] !== WALL) continue;
        const zone = this.zoneNear(x, y, zones);
        const base = zone?.wall ?? NEUTRAL_WALL;
        const shade = mix(base, 0x2b2027, 0.32);
        const deep = mix(base, 0x2b2027, 0.52);
        const hi = mix(base, 0xfaf0e0, 0.4);
        const bx = t(x);
        const by = t(y);
        g.fillStyle(base, 1);
        g.fillRect(bx, by, TILE, TILE);
        g.fillStyle(hi, 1);
        g.fillRect(bx, by + 2, TILE, 4); // trim rail highlight
        g.fillStyle(shade, 1);
        g.fillRect(bx, by + 6, TILE, 2);
        g.fillStyle(deep, 1);
        g.fillRect(bx, by + TILE - 6, TILE, 6); // baseboard
        g.fillStyle(shade, 1);
        g.fillRect(bx, by + TILE - 8, TILE, 2);
        // 2px dither band above the baseboard: fakes volume without any blur
        for (let i = 0; i < TILE; i += 4) {
          g.fillStyle(shade, 1);
          g.fillRect(bx + i, by + TILE - 10, 2, 2);
        }
        g.fillStyle(deep, 1);
        g.fillRect(bx, by, 2, TILE); // 1 art-pixel seam between wall blocks
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
    this.layHallwayRunner();
    this.layDoormats();
  }

  /** communal hallway runner rug down the corridor spine, inset a tile from each wall */
  private layHallwayRunner() {
    const cy = t(HALL.y + HALL.h / 2);
    const x0 = HALL.x + 1;
    const x1 = HALL.x + HALL.w - 1;
    for (let tx = x0; tx < x1; tx++)
      this.add
        .image(t(tx), cy, "runner")
        .setOrigin(0, 0.5)
        .setTint(0x9a6a55)
        .setDepth(1);
    this.add.image(t(x0), cy, "runner-cap").setOrigin(1, 0.5).setTint(0x9a6a55).setDepth(1);
    this.add
      .image(t(x1), cy, "runner-cap")
      .setOrigin(1, 0.5)
      .setFlipX(true)
      .setTint(0x9a6a55)
      .setDepth(1);
  }

  /** thin woven mat layered on top of every doorway sill */
  private layDoormats() {
    DOORWAYS.forEach(([x, y], i) => {
      const personal = i < 6 ? ROOMS[Math.floor(i / 2)] : undefined;
      const tint = personal
        ? mix(Phaser.Display.Color.HexStringToColor(personal.accentColor).color, 0xd8c8ad, 0.45)
        : 0xc3b39a;
      this.add
        .image(t(x) + TILE / 2, t(y) + TILE / 2, "doormat")
        .setTint(tint)
        .setDepth(1);
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
        fontFamily: "ui-monospace, Menlo, monospace",
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
      // 2px stepped bob — reads as sprite animation, not a smooth CSS float
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
    return s;
  }

  /** Generic personal-room builder: same code path for every person record. */
  private buildPersonalRoom(room: PersonRoom, rect: Rect, doorX: number) {
    const mood = MOODS[room.mood];
    const accent = Phaser.Display.Color.HexStringToColor(room.accentColor).color;

    // accent trim strip along the top wall — accent as trim, not as base tone
    this.add
      .rectangle(t(rect.x), t(rect.y), t(rect.w), 4, accent, 1)
      .setOrigin(0, 0)
      .setDepth(1);

    // woven area rug, accent-tinted (opaque pixels, no soft blend)
    this.add
      .image(t(rect.x + rect.w / 2), t(rect.y + rect.h / 2 + 0.2), "rug")
      .setTint(mix(mood.posterAccent, 0xbca584, 0.18))
      .setScale(0.85)
      .setDepth(1);

    // pixel poster on the top wall: ink frame, flat accent field, 2-tone motif
    const px = t(rect.x + rect.w / 2);
    const py = t(rect.y) + 18;
    this.add.rectangle(px, py, 80, 48, 0x241c26, 1).setDepth(2);
    this.add.rectangle(px, py, 74, 42, mix(mood.posterAccent, 0x8b7a63, 0.12), 1).setDepth(3);
    this.add.rectangle(px, py - 6, 48, 18, 0xefe2c9, 1).setDepth(4);
    this.add.rectangle(px, py + 12, 34, 6, 0x241c26, 1).setDepth(4);

    // furniture + interactives, rendered generically from room.layout
    for (const placed of room.layout) {
      const item = ITEM_CATALOG[placed.itemId];
      if (!item) continue;
      const payload: PopupPayload | undefined =
        item.interactive === "songs"
          ? { kind: "songs", room }
          : item.interactive === "bulletin"
            ? { kind: "bulletin", room }
            : item.interactive === "companion"
              ? { kind: "companion", room }
              : undefined;
      const def: PropDef = {
        key: item.textureKey,
        x: t(rect.x + placed.gx),
        y: t(rect.y + placed.gy),
        solid: item.solid,
      };
      if (payload) def.payload = payload;
      this.prop(def);
    }

    // ---- door: nameplate, stickers, presence glow, sound cue ----
    const dx = t(doorX) + TILE;
    const dy = t(16) + TILE / 2;
    this.add.rectangle(dx, dy, TILE * 2 - 4, TILE - 6, 0x241c26, 1).setDepth(4);
    this.add.rectangle(dx, dy, TILE * 2 - 8, TILE - 10, accent, 1).setDepth(4);
    this.label(dx, dy - 46, room.name, "#241c26", 13).setDepth(5);

    room.doorStickers.slice(0, 3).forEach((st, i) => {
      const key = `sticker-${st}`;
      if (!this.textures.exists(key)) return;
      this.add
        .image(dx - 18 + i * 18, dy + 4, key)
        .setDepth(6)
        .setScale(0.8)
        .setTint(0xfffdf5);
    });

    // presence: hard-edged dithered pixel halo over the doorway lamp
    const glow = this.add
      .image(dx, dy - 2, "glow")
      .setTint(mood.glow)
      .setDepth(3)
      .setScale(0.9)
      .setAlpha(room.isActive ? 0.4 : 0.1);
    // pixel lamp above the door
    this.add.rectangle(dx, dy - 34, 8, 6, 0x241c26, 1).setDepth(5);
    this.add
      .rectangle(dx, dy - 33, 4, 3, room.isActive ? mood.glow : 0x6b6270, 1)
      .setDepth(6);

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
    } else if (room.awayNote) {
      // "someone's out" note taped to the door, rather than a blank dim door
      this.add.image(dx, dy + 2, "awaynote").setDepth(7);
      this.label(dx, dy + 30, room.awayNote, "#4a3d43", 11).setDepth(7);
    }
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
    ROOMS.forEach((room, i) => this.buildPersonalRoom(room, PERSONAL_RECTS[i]!, doorXs[i]!));

    // zone labels
    for (const z of COMMON) this.label(t(z.x + z.w / 2), t(z.y) + 14, z.label, "#3a2f34", 15);
    this.label(t(HALL.x + 1.6), t(HALL.y) + 14, "Floor 3", "#6b5c50", 14);

    // ---- Common Lounge ----
    const L = COMMON[0]!;
    // seating cluster: TV up top, low table in the middle, couches facing in
    this.prop({ key: "tv", x: t(L.x + 4), y: t(L.y + 1.8), solid: true });
    this.prop({
      key: "table",
      x: t(L.x + 4),
      y: t(L.y + 4.8),
      payload: { kind: "flavor", ...FLAVOR_PROPS.lounge },
    });
    this.prop({ key: "couch", x: t(L.x + 4), y: t(L.y + 7.6), solid: true });
    // second couch renders as-authored: its texture is baked teal, and setTint
    // multiplies, so a coral override would crush to mud
    this.prop({ key: "couch", x: t(L.x + 10.8), y: t(L.y + 4.8), scale: 0.9, solid: true });
    // looser accent pieces off to the side
    this.prop({ key: "record", x: t(L.x + 13.8), y: t(L.y + 8.4) });
    this.prop({ key: "plant", x: t(L.x + 14.2), y: t(L.y + 1.8), scale: 1.05 });
    this.prop({ key: "shoerack", x: t(L.x + 9.6), y: t(L.y + 1.3) });

    // ---- Study Lounge ----
    const S = COMMON[1]!;
    this.prop({ key: "desk", x: t(S.x + 3.2), y: t(S.y + 2.6), solid: true });
    this.prop({ key: "desk", x: t(S.x + 3.2), y: t(S.y + 7.6), solid: true });
    this.prop({
      key: "shelf",
      x: t(S.x + 11.4),
      y: t(S.y + 2.4),
      payload: { kind: "flavor", ...FLAVOR_PROPS.study },
      solid: true,
    });
    this.prop({ key: "plant", x: t(S.x + 11.6), y: t(S.y + 8.2) });

    // ---- Kitchenette ----
    const K = COMMON[2]!;
    this.prop({ key: "counter", x: t(K.x + 6), y: t(K.y + 8) , solid: true });
    this.prop({
      key: "fridge",
      x: t(K.x + 1.9),
      y: t(K.y + 2.6),
      payload: { kind: "flavor", ...FLAVOR_PROPS.kitchen },
      solid: true,
    });
    this.prop({ key: "table", x: t(K.x + 8.6), y: t(K.y + 3.4) });
    this.prop({ key: "plant", x: t(K.x + 10.4), y: t(K.y + 7.6), scale: 0.9 });

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
    }


    // ---- hallway shared props ----
    this.prop({
      key: "board",
      x: t(24),
      y: t(HALL.y) + 22,
      scale: 1.15,
      payload: { kind: "corkboard" },
      label: COMMUNITY_CORKBOARD.title,
    });
    this.label(t(24), t(HALL.y) - 4, "Community corkboard", "#4a3d43", 12);

    this.prop({
      key: "vending",
      x: t(46),
      y: t(HALL.y) + 32,
      payload: { kind: "flavor", ...FLAVOR_PROPS.vending },
      solid: true,
    });
    this.prop({
      key: "crate",
      x: t(8),
      y: t(HALL.y) + 34,
      payload: { kind: "flavor", ...FLAVOR_PROPS.lostFound },
    });
    this.label(t(8), t(HALL.y) + 62, "Lost & found", "#4a3d43", 12);

    // locked "more rooms coming" door on the hallway's south wall
    this.prop({
      key: "lockdoor",
      x: t(65.5),
      y: t(22) + 6,
      payload: { kind: "flavor", ...FLAVOR_PROPS.locked },
    }).setAlpha(0.75);

    // club flyers / lost-pet posters taped along the hallway walls
    const flyers: Array<[number, number, string, number]> = [
      [20, 16.55, "flyer-a", 0xfffdf5],
      [27.5, 16.45, "flyer-b", 0xf0ecdc],
      [43.5, 16.6, "flyer-c", 0xfdf3ea],
      [61, 16.5, "flyer-d", 0xf6f0dd],
      [18.5, 22.5, "flyer-b", 0xfaf4e4],
      [39.5, 22.45, "flyer-a", 0xf3ecd8],
    ];
    for (const [fx, fy, key, tint] of flyers)
      this.add.image(t(fx), t(fy), key).setTint(tint).setDepth(4);

    // recycling + trash pair
    this.prop({ key: "bin", x: t(40), y: t(HALL.y) + 40, tint: 0x7f9ec4 });
    this.prop({ key: "bin", x: t(40.9), y: t(HALL.y) + 42 });

    // mail cubbies on the hallway wall
    this.prop({
      key: "cubby",
      x: t(30),
      y: t(HALL.y) + 16,
      payload: { kind: "flavor", title: "Mail Cubbies", lines: ["Someone's Amazon package again", "One postcard from 2019"] },
    });
    this.label(t(30), t(HALL.y) - 6, "Mail cubbies", "#4a3d43", 12);

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
    cam.setBackgroundColor("#2b2431");
    cam.startFollow(this.player, true, 0.16, 0.16);
    cam.setZoom(1.6);
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
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
    const key = `char-${this.facing}-${step}`;
    if (this.player.texture.key !== key) this.player.setTexture(key);

    this.checkProximity();
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
      this.activePayload = next;
      this.onPopup(next);
    }
  }
}
