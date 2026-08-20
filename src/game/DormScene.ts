import * as Phaser from "phaser";
import {
  COMMUNITY_CORKBOARD,
  FLAVOR_PROPS,
  MOODS,
  ROOMS,
  type PersonRoom,
  type PopupPayload,
} from "@/data/dorm";
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

const NEUTRAL_WALL = 0xd6c7b6; // warm grey trim for hallway + common rooms

const HALL: Zone = {
  id: "hall",
  label: "Hallway",
  x: 2,
  y: 17,
  w: 66,
  h: 5,
  floor: 0xf3ece2,
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
    floor: 0xf6e7d7,
    wall: NEUTRAL_WALL,
    kind: "common",
  },
  {
    id: "study",
    label: "Study Lounge",
    x: 28,
    y: 23,
    w: 14,
    h: 10,
    floor: 0xe7eef3,
    wall: NEUTRAL_WALL,
    kind: "common",
  },
  {
    id: "kitchen",
    label: "Kitchenette",
    x: 48,
    y: 23,
    w: 12,
    h: 10,
    floor: 0xfaeacd,
    wall: NEUTRAL_WALL,
    kind: "common",
  },
  {
    id: "courtyard",
    label: "Courtyard",
    x: 69,
    y: 7,
    w: 16,
    h: 21,
    floor: 0xcfe8bd,
    wall: mix(NEUTRAL_WALL, 0x9fc48c, 0.45),
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
        floor: mood.wallpaper,
        // personal rooms get accent-tinted wall trim
        wall: mix(accent, 0xfaf3ea, 0.42),
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

  /** flooring pattern per zone kind — reinforces the wall boundary */
  private paintZoneFloor(g: Phaser.GameObjects.Graphics, z: Zone) {
    g.fillStyle(z.floor, 1);
    g.fillRect(t(z.x), t(z.y), t(z.w), t(z.h));

    if (z.kind === "personal") {
      // two-tone checker wallpaper-flooring in the mood palette
      const dark = mix(z.floor, 0x8a6f7c, 0.14);
      for (let y = z.y; y < z.y + z.h; y++)
        for (let x = z.x; x < z.x + z.w; x++) {
          if ((x + y) % 2 !== 0) continue;
          g.fillStyle(dark, 1);
          g.fillRect(t(x), t(y), TILE, TILE);
        }
      // faint diagonal weave
      g.lineStyle(1, 0xffffff, 0.16);
      for (let i = 0; i < (z.w + z.h) * 2; i++) {
        const ox = t(z.x) + i * 16 - t(z.h);
        g.lineBetween(ox, t(z.y), ox + t(z.h), t(z.y + z.h));
      }
    } else if (z.kind === "outdoor") {
      const dark = mix(z.floor, 0x5f8f52, 0.16);
      for (let y = z.y; y < z.y + z.h; y++)
        for (let x = z.x; x < z.x + z.w; x++) {
          g.fillStyle(dark, (x * 7 + y * 13) % 3 === 0 ? 0.5 : 0.16);
          g.fillRoundedRect(t(x) + 2, t(y) + 2, TILE - 4, TILE - 4, 10);
        }
    } else {
      // hallway + common rooms: neutral wood planks
      const seam = mix(z.floor, 0x9c8a76, 0.35);
      const plank = mix(z.floor, 0xffffff, 0.35);
      for (let y = z.y; y < z.y + z.h; y++) {
        if ((y - z.y) % 2 === 0) {
          g.fillStyle(plank, 0.5);
          g.fillRect(t(z.x), t(y), t(z.w), TILE);
        }
        g.fillStyle(seam, 0.35);
        g.fillRect(t(z.x), t(y), t(z.w), 1.5);
        // staggered plank joints
        for (let x = z.x + ((y - z.y) % 2 === 0 ? 0 : 2); x < z.x + z.w; x += 4) {
          g.fillStyle(seam, 0.3);
          g.fillRect(t(x), t(y) + 2, 1.5, TILE - 4);
        }
      }
    }

    // soft warm ambient wash
    g.fillStyle(z.kind === "outdoor" ? 0xfff6c9 : 0xffe9c4, z.kind === "outdoor" ? 0.12 : 0.09);
    g.fillRect(t(z.x), t(z.y), t(z.w), t(z.h));
    // inner shadow at the wall line so the floor reads as enclosed
    g.fillStyle(0x2a2030, 0.09);
    g.fillRect(t(z.x), t(z.y), t(z.w), 6);
    g.fillRect(t(z.x), t(z.y), 6, t(z.h));
    g.fillRect(t(z.x + z.w) - 6, t(z.y), 6, t(z.h));
  }

  private paintFloor(zones: Zone[]) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (const z of zones) this.paintZoneFloor(g, z);

    // ---- walls: solid tiles, wainscot cap + baseboard shadow ----
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (this.grid[y]![x] !== WALL) continue;
        const zone = this.zoneNear(x, y, zones);
        const base = zone?.wall ?? NEUTRAL_WALL;
        g.fillStyle(mix(base, 0x2a2030, 0.18), 1);
        g.fillRect(t(x), t(y), TILE, TILE);
        g.fillStyle(base, 1);
        g.fillRect(t(x) + 1, t(y), TILE - 2, TILE - 5);
        // wainscoting cap
        g.fillStyle(mix(base, 0xffffff, 0.55), 1);
        g.fillRect(t(x), t(y) + 3, TILE, 7);
        g.fillStyle(mix(base, 0x2a2030, 0.28), 0.5);
        g.fillRect(t(x), t(y) + 10, TILE, 2);
        // baseboard
        g.fillStyle(mix(base, 0x2a2030, 0.35), 1);
        g.fillRect(t(x), t(y) + TILE - 5, TILE, 5);
      }
    }

    // ---- doorway thresholds ----
    for (const [x, y] of DOORWAYS) {
      g.fillStyle(0xf6efe4, 1);
      g.fillRect(t(x), t(y), TILE, TILE);
      g.fillStyle(0xd9cbb8, 0.75);
      g.fillRect(t(x), t(y), TILE, 5);
      g.fillRect(t(x), t(y) + TILE - 5, TILE, 5);
      g.fillStyle(0x2a2030, 0.07);
      g.fillRect(t(x), t(y) + 5, TILE, TILE - 10);
    }

    g.generateTexture("floormap", GRID_W * TILE, GRID_H * TILE);
    g.destroy();
    this.add.image(0, 0, "floormap").setOrigin(0, 0).setDepth(0);
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

  private label(x: number, y: number, text: string, color = "#6b5f6e", size = 14) {
    return this.add
      .text(x, y, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${size}px`,
        color,
        fontStyle: "600",
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0.85);
  }

  private prop(def: PropDef) {
    const s = this.add.sprite(def.x, def.y, def.key).setDepth(def.y + (def.depthBias ?? 0));
    if (def.scale) s.setScale(def.scale);
    if (def.tint) s.setTint(def.tint);
    if (def.solid) {
      const zw = s.displayWidth * 0.8;
      const zh = s.displayHeight * 0.4;
      const zy = def.y + s.displayHeight * 0.2;
      const zone = this.add.zone(def.x, zy, zw, zh);
      this.walls.add(zone);
      for (let ty = Math.floor((zy - zh / 2) / TILE); ty <= Math.floor((zy + zh / 2) / TILE); ty++)
        for (let tx = Math.floor((def.x - zw / 2) / TILE); tx <= Math.floor((def.x + zw / 2) / TILE); tx++)
          if (this.grid[ty]?.[tx] === FLOOR) this.grid[ty]![tx] = BLOCKED;
    }
    if (def.payload) {
      const ring = this.add
        .image(def.x, def.y + 6, "glow")
        .setDepth(1)
        .setAlpha(0)
        .setScale(0.75)
        .setTint(0xfff3c4);
      this.interactives.push({ sprite: s, ring, payload: def.payload });
      this.tweens.add({ targets: s, y: def.y - 2, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    return s;
  }

  /** Generic personal-room builder: same code path for every person record. */
  private buildPersonalRoom(room: PersonRoom, rect: Rect, doorX: number) {
    const mood = MOODS[room.mood];
    const accent = Phaser.Display.Color.HexStringToColor(room.accentColor).color;

    // wallpaper accent band along the top wall (inside the room)
    const band = this.add
      .rectangle(t(rect.x), t(rect.y), t(rect.w), TILE * 0.8, accent, 0.16)
      .setOrigin(0, 0)
      .setDepth(1);
    band.setStrokeStyle(0);

    // area rug, tinted to the mood
    this.add
      .image(t(rect.x + rect.w / 2), t(rect.y + rect.h / 2 + 0.2), "rug")
      .setTint(mood.posterAccent)
      .setAlpha(0.4)
      .setScale(1.15)
      .setDepth(1);

    // poster on the top wall
    const px = t(rect.x + rect.w / 2);
    const poster = this.add.rectangle(px, t(rect.y) + 18, 84, 52, mood.posterAccent, 0.95).setDepth(2);
    poster.setStrokeStyle(4, 0xfffaf0, 0.9);
    this.add.rectangle(px, t(rect.y) + 18, 48, 22, 0xffffff, 0.5).setDepth(3);

    // decor furniture
    this.prop({ key: "bed", x: t(rect.x + 9.2), y: t(rect.y + 6.6), solid: true });
    this.prop({ key: "desk", x: t(rect.x + 2.6), y: t(rect.y + 7.4), solid: true });

    // interactive objects
    this.prop({
      key: "speaker",
      x: t(rect.x + 2),
      y: t(rect.y + 2.2),
      payload: { kind: "songs", room },
    });
    this.prop({
      key: "board",
      x: t(rect.x + 9.3),
      y: t(rect.y + 1.8),
      payload: { kind: "bulletin", room },
    });
    this.prop({
      key: room.companion.type === "plant" ? "plant" : "pet",
      x: t(rect.x + 2),
      y: t(rect.y + 4.9),
      payload: { kind: "companion", room },
    });


    // ---- door: nameplate, stickers, presence glow, sound cue ----
    const dx = t(doorX) + TILE;
    const dy = t(16) + TILE / 2;
    this.add.rectangle(dx, dy, TILE * 2 - 4, TILE - 6, accent, 0.55).setDepth(4);
    this.label(dx, dy - 24, room.name, "#5a4f5e", 13).setDepth(5);

    room.doorStickers.slice(0, 3).forEach((st, i) => {
      const key = `sticker-${st}`;
      if (!this.textures.exists(key)) return;
      this.add
        .image(dx - 18 + i * 18, dy + 4, key)
        .setDepth(6)
        .setScale(0.8)
        .setTint(0xfffdf5);
    });

    const glow = this.add
      .image(dx, dy, "glow")
      .setTint(mood.glow)
      .setDepth(3)
      .setScale(1.5)
      .setAlpha(room.isActive ? 0.5 : 0.12);

    // room-interior ambience glow (shared texture, one instance)
    const ambience = this.add
      .image(t(rect.x + rect.w / 2), t(rect.y + rect.h / 2), "glow")
      .setTint(mood.glow)
      .setDepth(1)
      .setScale(4.2)
      .setAlpha(room.isActive ? 0.22 : 0.07);

    if (room.isActive) {
      this.tweens.add({
        targets: [glow, ambience],
        alpha: { from: 0.5, to: 0.22 },
        scale: "+=0.35",
        duration: mood.pulseMs,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.spawnSoundCue(dx, dy - 10, mood.glow);
      this.spawnSoundCue(t(rect.x + 2), t(rect.y + 1.2), mood.glow);
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
    const doorXs = [12, 35, 58];
    ROOMS.forEach((room, i) => this.buildPersonalRoom(room, PERSONAL_RECTS[i]!, doorXs[i]!));

    // zone labels
    for (const z of COMMON) this.label(t(z.x + z.w / 2), t(z.y) + 14, z.label, "#6f6273", 16);
    this.label(t(HALL.x + 4), t(HALL.y) + 12, "Floor 3", "#8d8090", 15);

    // ---- Common Lounge ----
    const L = COMMON[0]!;
    this.prop({ key: "couch", x: t(L.x + 5), y: t(L.y + 5), solid: true });
    this.prop({ key: "couch", x: t(L.x + 15), y: t(L.y + 8.6), scale: 0.9, tint: 0xe9b7a6, solid: true });
    this.prop({ key: "table", x: t(L.x + 10), y: t(L.y + 6.6), payload: { kind: "flavor", ...FLAVOR_PROPS.lounge } });
    this.prop({ key: "tv", x: t(L.x + 16), y: t(L.y + 3.4), solid: true });
    this.prop({ key: "record", x: t(L.x + 3), y: t(L.y + 9.4) });
    this.prop({ key: "plant", x: t(L.x + 19.5), y: t(L.y + 2.5), scale: 1.1 });

    // ---- Study Lounge ----
    const S = COMMON[1]!;
    this.prop({ key: "desk", x: t(S.x + 5), y: t(S.y + 4.6), solid: true });
    this.prop({ key: "desk", x: t(S.x + 12), y: t(S.y + 8.6), solid: true });
    this.prop({ key: "shelf", x: t(S.x + 13.5), y: t(S.y + 3), payload: { kind: "flavor", ...FLAVOR_PROPS.study }, solid: true });
    this.prop({ key: "plant", x: t(S.x + 2), y: t(S.y + 9.6) });

    // ---- Kitchenette ----
    const K = COMMON[2]!;
    this.prop({ key: "counter", x: t(K.x + 6.5), y: t(K.y + 8.6), solid: true });
    this.prop({ key: "fridge", x: t(K.x + 2), y: t(K.y + 3.6), payload: { kind: "flavor", ...FLAVOR_PROPS.kitchen }, solid: true });
    this.prop({ key: "table", x: t(K.x + 9), y: t(K.y + 4.5) });

    // ---- Courtyard ----
    const C = COMMON[3]!;
    this.prop({ key: "tree", x: t(C.x + 4.5), y: t(C.y + 6), solid: true });
    this.prop({ key: "bench", x: t(C.x + 4.5), y: t(C.y + 12), payload: { kind: "flavor", ...FLAVOR_PROPS.courtyard } });
    this.prop({ key: "bench", x: t(C.x + 4.5), y: t(C.y + 20), scale: 0.95 });
    this.prop({ key: "plant", x: t(C.x + 1.5), y: t(C.y + 24.5) });
    this.prop({ key: "tree", x: t(C.x + 6), y: t(C.y + 26), scale: 0.8, solid: true });
    // string lights across the courtyard
    for (let i = 0; i < 14; i++) {
      const lx = t(C.x + 1) + i * 20;
      const ly = t(C.y + 2) + Math.sin(i * 0.9) * 6;
      this.add.image(lx, ly, "sparkle").setTint(0xffe9a8).setDepth(2).setAlpha(0.9);
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
    this.label(t(24), t(HALL.y) - 4, "Community corkboard", "#8d8090", 12);

    this.prop({
      key: "vending",
      x: t(46),
      y: t(HALL.y) + 32,
      payload: { kind: "flavor", ...FLAVOR_PROPS.vending },
      solid: true,
    });
    this.prop({
      key: "crate",
      x: t(6),
      y: t(HALL.y) + 30,
      payload: { kind: "flavor", ...FLAVOR_PROPS.lostFound },
    });
    this.label(t(6), t(HALL.y) + 6, "Lost & found", "#8d8090", 12);

    // locked "more rooms coming" door on the hallway's south wall
    this.prop({
      key: "lockdoor",
      x: t(65.5),
      y: t(22) + 6,
      payload: { kind: "flavor", ...FLAVOR_PROPS.locked },
    }).setAlpha(0.75);
    this.label(t(65.5), t(22) - 26, "304", "#9a93a3", 12);

    void zones;
  }

  // ---------- player ----------

  private spawnPlayer() {
    this.player = this.physics.add
      .sprite(t(13) + 16, t(19) + 16, "char-down-0")
      .setDepth(1000);
    this.player.setScale(1.15);
    this.player.setOrigin(0.5, 0.85);
    this.player.body!.setSize(18, 12);
    this.player.body!.setOffset(5, 24);
    this.physics.add.collider(this.player, this.walls);
    this.physics.world.setBounds(0, 0, GRID_W * TILE, GRID_H * TILE);
    this.player.setCollideWorldBounds(true);
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GRID_W * TILE, GRID_H * TILE);
    cam.setBackgroundColor("#e9eef2");
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
