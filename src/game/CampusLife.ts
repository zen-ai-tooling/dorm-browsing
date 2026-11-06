import * as Phaser from "phaser";
import {
  CAMPUS_PROPS, WAYPOINTS, WAYPOINT_GRAPH, leafPhaseForMonth, clockAt, libraryOpen,
  stringLightsOn, truckForDate, drinkForDate, flyersForDate, seededRandom, TRUCKS,
} from "@/data/campus";
import { STUDENTS, studentCount, overheardFor } from "@/data/students";
import { SQUIRREL_COUNT, PIGEON_COUNT, PROFESSOR_FOLLOW_MS, professorPlace, PROFESSOR_ANCHORS } from "@/data/animals";
import { todayKey } from "@/data/prompts";
import type { PopupPayload } from "@/data/dorm";
import { buildCharTextures } from "./textures";
import { DEFAULT_LOOK } from "@/data/avatar";
import type { Light, Lighting } from "./lighting";

type Point = { x: number; y: number };
type Student = {
  sprite: Phaser.GameObjects.Sprite; prop: Phaser.GameObjects.Image; node: string;
  path: Point[]; wait: number; turn: number; nextSpeech: number; facing: string;
};
type Animal = {
  sprite: Phaser.GameObjects.Sprite; home: Point; path: Point[]; until: number;
  mode: "idle" | "flee" | "climb" | "scatter"; index: number;
};
interface Hooks {
  findPath: (sx: number, sy: number, gx: number, gy: number) => Point[];
  getHour: () => number;
  getHourOverride: () => number | null;
  register: (sprite: Phaser.GameObjects.Sprite, payload: PopupPayload) => void;
  onPetSpot: (near: boolean) => void;
  onPet: () => void;
  jordanInside: () => boolean;
}
const T = 32;
const center = (p: Point) => ({ x: (p.x + 0.5) * T, y: (p.y + 0.5) * T });
const OUTDOOR_CLIP = { x: 0, y: 34 * T, w: 88 * T, h: 26 * T };

/** Campus-only renderer and non-solid life. Routes always use the dorm's grid. */
export class CampusLife {
  students: Student[] = [];
  squirrels: Animal[] = [];
  pigeons: Animal[] = [];
  professor: Phaser.GameObjects.Sprite;
  private professorPath: Point[] = [];
  private professorUntil = 0;
  private professorNext = 0;
  private professorLocation = "";
  private petNear = false;
  private clock: Phaser.GameObjects.Graphics;
  private bell: Phaser.GameObjects.Container;
  private clockCenter = { x: 40.5 * T, y: 36.5 * T };
  private clockKey = "";
  private lastHour: number | null = null;
  private nextRefresh = 0;
  private professorReturning = false;
  private hourKey = "";
  private date = "";
  private windowLights: Light[] = [];
  private stringLights: Light[] = [];
  private windows: Phaser.GameObjects.Rectangle[] = [];
  private strings: Phaser.GameObjects.Graphics;
  private clockLight: Light;
  private windowOn = false;
  private stringsOn = false;
  private truck: Phaser.GameObjects.Sprite;
  private truckSign: Phaser.GameObjects.Text;
  private truckPayload: Extract<PopupPayload, { kind: "flavor" }>;
  private kioskPayload: Extract<PopupPayload, { kind: "flavor" }>;
  private coffeePayload: Extract<PopupPayload, { kind: "flavor" }>;
  private libraryPayload: Extract<PopupPayload, { kind: "flavor" }>;
  private fountain: Phaser.GameObjects.Sprite;
  private frisbee: Phaser.GameObjects.Image;
  private frisbeePair: Phaser.GameObjects.Sprite[] = [];
  private random = seededRandom("campus-life");
  private leafPhase = leafPhaseForMonth(new Date().getMonth() + 1);
  private leaves: Phaser.GameObjects.Rectangle[] = [];

  constructor(private scene: Phaser.Scene, private lighting: Lighting, private hooks: Hooks) {
    const s = scene;
    s.add.sprite(24 * T, 50 * T, "campus-library").setOrigin(0, 1).setDepth(49.5 * T);
    // Labels are mounted on the library face and cart fascia, never on the floor.
    s.add.text(40.5 * T, 46.8 * T, "HALE LIBRARY", this.textStyle(20)).setOrigin(0.5).setDepth(50 * T);
    const steps = s.add.graphics().setDepth(1);
    for (let y = 50 * T; y < 52 * T; y += 8) {
      steps.fillStyle(0xb6baad).fillRect(35 * T, y, 12 * T, 8);
      steps.fillStyle(0x7d8986).fillRect(35 * T, y + 6, 12 * T, 2);
    }
    this.clock = s.add.graphics().setDepth(50 * T + 1);
    const bx = this.clockCenter.x, by = 40.6 * T;
    this.bell = s.add.container(bx, by, [s.add.rectangle(0, 0, 18, 20, 0xd7b367), s.add.rectangle(0, 10, 26, 4, 0x947341), s.add.rectangle(0, 14, 4, 4, 0x493b32)]).setDepth(50 * T + 1);
    this.clockLight = lighting.add({ ...this.clockCenter, color: 0xf5d392, radius: 70, pool: false, clip: OUTDOOR_CLIP });
    for (const x of [27.3, 31.85, 48.9, 53.5]) {
      this.windows.push(s.add.rectangle(x * T, 48.2 * T, 64, 40, 0xf3ca79, 0.55).setDepth(50 * T + 1).setVisible(false));
    }
    const oak = CAMPUS_PROPS.find((p) => p.id === "oak");
    if (oak) s.add.sprite((oak.x + 0.5) * T, (oak.y + 1) * T, `campus-oak-${this.leafPhase}`).setOrigin(0.5, 1).setDepth((oak.y + 1) * T);
    for (const p of CAMPUS_PROPS) {
      const key = p.id.startsWith("picnic") ? "campus-picnic" : p.id.startsWith("bench") ? "campus-bench" : "";
      if (key) s.add.sprite((p.x + p.w / 2) * T, (p.y + 1) * T, key).setOrigin(0.5, 1).setDepth((p.y + 1) * T);
    }
    this.fountain = s.add.sprite(34 * T, 56 * T, "campus-fountain-0").setOrigin(0.5, 1).setDepth(56 * T);
    hooks.register(s.add.sprite(35.5 * T, 55.5 * T, "campus-frisbee").setVisible(false), { kind: "fountain" });
    // Invisible interaction anchors have their own visible proximity ring.
    const kiosk = s.add.sprite(18.5 * T, 52 * T, "campus-kiosk").setOrigin(0.5, 1).setDepth(52 * T);
    this.kioskPayload = { kind: "flavor", title: "Campus bulletin", lines: [] };
    hooks.register(kiosk, this.kioskPayload);
    this.truck = s.add.sprite(66 * T, 54 * T, "campus-truck-0").setOrigin(0.5, 1).setDepth(54 * T);
    this.truckSign = s.add.text(65.4 * T, 51.45 * T, "", this.textStyle(10)).setOrigin(0.5).setDepth(54 * T + 1);
    this.truckPayload = { kind: "flavor", title: "Food truck", lines: [] };
    hooks.register(this.truck, this.truckPayload);
    const cart = s.add.sprite(61 * T, 40 * T, "campus-coffee").setOrigin(0.5, 1).setDepth(40 * T);
    s.add.text(61 * T, 39.5 * T, "COFFEE", this.textStyle(10)).setOrigin(0.5).setDepth(40 * T + 1);
    this.coffeePayload = { kind: "flavor", title: "Campus coffee cart", lines: [] };
    hooks.register(cart, this.coffeePayload);
    buildCharTextures(s, "campus-barista", STUDENTS[3]?.look ?? DEFAULT_LOOK);
    s.add.sprite(62.5 * T, 39.6 * T, "campus-barista-down-0").setOrigin(0.5, 0.85).setDepth(40 * T);
    this.libraryPayload = { kind: "flavor", title: "Hale Library", lines: [] };
    hooks.register(s.add.sprite(40.5 * T, 50.5 * T, "campus-frisbee").setVisible(false), this.libraryPayload);
    for (const x of [8, 21, 59, 80]) this.lamp(x, 38.6);
    for (const [x, y] of [[18, 54], [60, 54], [30, 59], [56, 59]] as const) this.lamp(x, y);
    this.strings = s.add.graphics().setDepth(1900);
    for (const x of [8, 75]) {
      s.add.sprite(x * T, 57 * T, "tree").setOrigin(0.5, 1).setDepth(57 * T);
      s.add.sprite((x + 5) * T, 53 * T, "tree").setOrigin(0.5, 1).setDepth(53 * T);
      this.strings.lineStyle(2, 0x394b38);
      for (let i = 0; i < 8; i++) {
        const px = (x + i * 0.7) * T, py = (50.2 + i * 0.48 + Math.sin(i / 7 * Math.PI) * 0.6) * T;
        if (i > 0) this.strings.lineBetween(px - 0.7 * T, py - 0.48 * T, px, py);
        this.strings.fillStyle(i % 2 ? 0xe4ac75 : 0xf0d88f).fillRect(px, py, 4, 6);
      }
    }
    for (const [i, def] of STUDENTS.entries()) {
      buildCharTextures(s, `stu-${i}`, def.look);
      const node = i % 2 ? "east" : "west";
      const pos = center(WAYPOINTS[node] ?? { x: 3, y: 36 });
      const sprite = s.add.sprite(pos.x, pos.y, `stu-${i}-down-0`).setOrigin(0.5, 0.85).setVisible(false);
      const key = def.prop === "skateboard" ? "campus-skateboard" : def.prop === "backpack" ? "campus-backpack" : `emote-${def.prop}`;
      const prop = s.add.image(pos.x, pos.y, key).setScale(def.prop === "skateboard" ? 0.7 : 0.4).setVisible(false);
      this.students.push({ sprite, prop, node, path: [], wait: s.time.now + i * 700, turn: 0, nextSpeech: 0, facing: "down" });
    }
    this.frisbee = s.add.image(0, 0, "campus-frisbee").setVisible(false).setDepth(1850);
    for (const [i, x] of [9, 16].entries()) this.frisbeePair.push(s.add.sprite(x * T, 55 * T, `stu-${i}-right-0`).setOrigin(0.5, 0.85).setDepth(55 * T).setVisible(false));
    this.squirrels = this.makeAnimals(SQUIRREL_COUNT, "squirrel", [{ x: 40, y: 56 }, { x: 46, y: 54 }, { x: 37, y: 58 }]);
    this.pigeons = this.makeAnimals(PIGEON_COUNT, "pigeon", [{ x: 35, y: 54 }, { x: 32, y: 56 }, { x: 36, y: 56 }, { x: 59, y: 41 }, { x: 62, y: 41 }]);
    const catPlace = professorPlace(hooks.getHour());
    const catStart = center(PROFESSOR_ANCHORS[catPlace]);
    this.professorLocation = catPlace;
    this.professor = s.add.sprite(catStart.x, catStart.y, "campus-professor-0").setOrigin(0.5, 1).setDepth(catStart.y + 10);
    if (this.leafPhase === "autumn" || this.leafPhase === "blossom") for (let i = 0; i < 8; i++) this.leaves.push(s.add.rectangle(0, 0, 4, 2, this.leafPhase === "autumn" ? 0xd78b45 : 0xefb8c8).setDepth(1850));
    for (const [x, y] of [[61, 38.9], [64.4, 51.8]] as const) for (let i = 0; i < 3; i++) {
      const puff = s.add.rectangle((x + i * 0.15) * T, y * T, 4, 6, 0xe5ddd0, 0.5).setDepth(1900);
      s.tweens.add({ targets: puff, y: y * T - 24, alpha: 0, duration: 1800, delay: i * 550, repeat: -1, ease: "Stepped", easeParams: [5] });
    }
    this.refresh();
  }

  private textStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: '"Pixelify Sans", sans-serif', fontSize: `${fontSize}px`, color: "#fff3cf", backgroundColor: "#293c3b", padding: { x: 3, y: 2 } };
  }
  private lamp(x: number, y: number) {
    this.scene.add.sprite(x * T, y * T, "lamppost").setOrigin(0.5, 1).setDepth(y * T);
    this.lighting.add({ x: x * T, y: y * T - 65, color: 0xffd39b, radius: 110, poolDy: 65, clip: OUTDOOR_CLIP });
  }
  private makeAnimals(count: number, kind: string, tiles: Point[]) {
    return Array.from({ length: count }, (_, i): Animal => {
      const home = center(tiles[i] ?? tiles[0] ?? { x: 40, y: 55 });
      return { sprite: this.scene.add.sprite(home.x, home.y, `campus-${kind}-0`).setOrigin(0.5, 1).setDepth(home.y), home, path: [], until: i * 850, mode: "idle", index: i };
    });
  }
  private route(from: Point, tile: Point) {
    return this.hooks.findPath(Math.floor(from.x / T), Math.floor(from.y / T), tile.x, tile.y);
  }
  private advance(sprite: Phaser.GameObjects.Sprite, path: Point[], speed: number, delta: number) {
    let budget = speed * Math.min(delta, 250) / 1000;
    while (path.length && budget > 0) {
      const target = path[0];
      if (!target) break;
      const dx = target.x - sprite.x, dy = target.y - sprite.y, distance = Math.hypot(dx, dy);
      if (distance <= budget) { sprite.setPosition(target.x, target.y); path.shift(); budget -= distance; }
      else { sprite.setPosition(sprite.x + dx / distance * budget, sprite.y + dy / distance * budget); budget = 0; }
    }
  }
  private bubble(sprite: Point, text: string, ms = 3000) {
    const bubble = this.scene.add.text(sprite.x, sprite.y - 48, text, { ...this.textStyle(12), wordWrap: { width: 230 } }).setOrigin(0.5, 1).setDepth(4990);
    this.scene.time.delayedCall(ms, () => bubble.destroy());
  }
  private drawClock(hour: number, minute: number) {
    const g = this.clock, { x, y } = this.clockCenter;
    g.clear();
    for (let dy = -34; dy <= 34; dy += 2) for (let dx = -34; dx <= 34; dx += 2) {
      const d = Math.hypot(dx, dy);
      if (d <= 34) g.fillStyle(d > 30 ? 0x302f33 : 0xf1dfb4).fillRect(x + dx, y + dy, 2, 2);
    }
    for (let i = 0; i < 12; i++) { const a = i / 6 * Math.PI; g.fillStyle(0x594c40).fillRect(x + Math.round(Math.sin(a) * 26 / 2) * 2, y - Math.round(Math.cos(a) * 26 / 2) * 2, 2, 4); }
    const hand = (angle: number, length: number, color: number, width: number) => {
      for (let i = 0; i <= length; i += 2) g.fillStyle(color).fillRect(x + Math.round(Math.sin(angle) * i / 2) * 2, y - Math.round(Math.cos(angle) * i / 2) * 2, width, width);
    };
    hand((hour % 12 + minute / 60) / 6 * Math.PI, 18, 0x53493f, 4);
    hand(minute / 30 * Math.PI, 26, 0x302f33, 2);
    g.fillStyle(0xab663e).fillRect(x - 2, y - 2, 6, 6);
  }
  private ringHour(hour: number) {
    const count = Math.min(3, hour % 12 || 12);
    this.scene.tweens.add({ targets: this.bell, angle: 14, duration: 250, yoyo: true, repeat: 3, ease: "Stepped", easeParams: [3] });
    for (let i = 0; i < count; i++) this.scene.time.delayedCall(i * 750, () => this.bubble({ x: this.clockCenter.x, y: this.clockCenter.y - 5 }, "DONG", 650));
  }
  refresh() {
    const now = new Date(), hour = this.hooks.getHour(), date = todayKey(now);
    const clock = clockAt(now, this.hooks.getHourOverride());
    const ck = `${clock.hour}:${clock.minute}`;
    if (ck !== this.clockKey) {
      this.clockKey = ck; this.drawClock(clock.hour, clock.minute);
      if (clock.minute === 0 && (this.lastHour === null ? this.hooks.getHourOverride() !== null : this.lastHour !== clock.hour)) this.ringHour(clock.hour);
      this.lastHour = clock.hour;
    }
    if (this.date !== date) {
      this.date = date;
      const truck = truckForDate(date);
      if (truck) { this.truck.setTexture(`campus-truck-${TRUCKS.indexOf(truck)}`); this.truckSign.setText(truck.name); this.truckPayload.title = truck.name; this.truckPayload.lines = [...truck.menu]; }
      this.kioskPayload.lines = flyersForDate(date);
      this.coffeePayload.lines = ["Drink of the day", drinkForDate(date), hour >= 6 ? "The barista remembers everyone's order. Somehow." : "Back at 6am. The espresso machine is dreaming."];
    }
    this.coffeePayload.lines = ["Drink of the day", drinkForDate(date), hour >= 6 ? "The barista remembers everyone's order. Somehow." : "Back at 6am. The espresso machine is dreaming."];
    const libraryLines = ["Hale Library — open 8am–2am.", libraryOpen(hour) ? (this.hooks.jordanInside() ? "Jordan is studying here." : "Quiet tables, warm windows, one very determined printer.") : "Closed for a little sleep. Back at 8am."];
    if (libraryLines.join("|") !== this.libraryPayload.lines.join("|")) this.libraryPayload.lines = libraryLines;
    const winOn = libraryOpen(hour);
    if (winOn !== this.windowOn) {
      this.windowOn = winOn;
      this.windows.forEach((w) => w.setVisible(winOn));
      this.windowLights.forEach((l) => this.lighting.remove(l)); this.windowLights = [];
      if (winOn) for (const w of this.windows) this.windowLights.push(this.lighting.add({ x: w.x, y: w.y, color: 0xf4b966, radius: 90, poolDy: 44, clip: OUTDOOR_CLIP }));
    }
    const lightsOn = stringLightsOn(hour);
    if (lightsOn !== this.stringsOn) {
      this.stringsOn = lightsOn;
      this.stringLights.forEach((l) => this.lighting.remove(l)); this.stringLights = [];
      if (lightsOn) for (const x of [8, 75]) for (let i = 0; i < 8; i++) this.stringLights.push(this.lighting.add({ x: (x + i * 0.7) * T, y: (50.2 + i * 0.48 + Math.sin(i / 7 * Math.PI) * 0.6) * T, color: i % 2 ? 0xe4ac75 : 0xf0d88f, radius: 32, pool: false, twinkle: i * 200, clip: OUTDOOR_CLIP }));
    }
    const hk = `${date}:${hour}`;
    if (hk !== this.hourKey) {
      this.hourKey = hk;
      const count = studentCount(hour, date);
      // Frisbee players are part of the ten-person cap, not extra NPCs.
      const pair = hour >= 12 && hour < 15;
      this.frisbeePair.forEach((s) => s.setVisible(pair));
      this.frisbee.setVisible(pair);
      this.students.forEach((st, i) => {
        const active = i < count - (pair ? 2 : 0);
        const wasVisible = st.sprite.visible;
        st.sprite.setVisible(active); st.prop.setVisible(active);
        if (active && !wasVisible) {
          const start = hour >= 12 ? ["picnic0", "picnic1", "fountain", "bench0", "oak", "truck"][i % 6] ?? "east" : i % 2 ? "east" : "west";
          st.node = start; const pos = center(WAYPOINTS[start] ?? { x: 3, y: 36 }); st.sprite.setPosition(pos.x, pos.y); st.path = [];
        }
      });
      this.professorNext = 0;
    }
  }
  tossCoin() {
    const coin = this.scene.add.rectangle(35.5 * T, 55.5 * T, 6, 6, 0xf1d467).setDepth(4990);
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: 650, ease: "Stepped", easeParams: [10], onUpdate: (tw) => {
      const f = tw.getValue() ?? 0; coin.setPosition((35.5 - f * 1.5) * T, (55.5 - f) * T - Math.sin(f * Math.PI) * 55);
    }, onComplete: () => { coin.destroy(); this.bubble({ x: 34 * T, y: 55 * T }, "plip!", 900); } });
  }
  petProfessor() {
    if (!this.petNear) return;
    this.professorUntil = this.scene.time.now + PROFESSOR_FOLLOW_MS;
    this.professorReturning = true;
    this.professorPath = []; this.professorNext = 0;
    this.bubble(this.professor, "purr… ♥ ♥", 2000);
    this.hooks.onPet();
  }
  update(time: number, delta: number, player: Point) {
    if (time >= this.nextRefresh) { this.nextRefresh = time + 1000; this.refresh(); }
    const view = this.scene.cameras.main.worldView;
    for (const [i, st] of this.students.entries()) {
      if (!st.sprite.visible) continue;
      const target = st.path[0];
      if (target) {
        const dx = target.x - st.sprite.x, dy = target.y - st.sprite.y;
        st.facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
        this.advance(st.sprite, st.path, STUDENTS[i]?.prop === "skateboard" ? 220 : this.hooks.getHour() < 8 ? 170 : 100, delta);
        if (view.contains(st.sprite.x, st.sprite.y)) st.sprite.setTexture(`stu-${i}-${st.facing}-${Math.floor(time / 160) % 2 + 1}`).setDepth(st.sprite.y);
        if (!st.path.length) st.wait = time + 4000 + i * 900;
      } else if (time >= st.wait) {
        const choices = WAYPOINT_GRAPH[st.node] ?? ["walkEast"];
        const next = choices[Math.floor(this.random() * choices.length)] ?? "walkEast";
        const point = WAYPOINTS[next];
        if (point) { st.path = this.route(st.sprite, point); st.node = next; }
        st.wait = time + 3000;
      } else if (view.contains(st.sprite.x, st.sprite.y)) st.sprite.setTexture(`stu-${i}-${st.facing}-0`).setDepth(st.sprite.y);
      if (view.contains(st.sprite.x, st.sprite.y)) {
        const seated = !st.path.length && (st.node.startsWith("bench") || st.node.startsWith("picnic"));
        st.sprite.setScale(1, seated ? 0.85 : 1);
        st.prop.setPosition(st.sprite.x + (STUDENTS[i]?.prop === "skateboard" ? 0 : 11), st.sprite.y + (STUDENTS[i]?.prop === "skateboard" ? 2 : -16)).setDepth(st.sprite.y + 1);
      }
      if (Math.hypot(player.x - st.sprite.x, player.y - st.sprite.y) < 48 && time > st.nextSpeech) {
        this.bubble(st.sprite, overheardFor(i, st.turn++)); st.nextSpeech = time + 18000;
      }
    }
    if (this.frisbee.visible) {
      const f = time % 2200 / 2200, forward = Math.floor(time / 2200) % 2 === 0;
      this.frisbee.setPosition((9 + (forward ? f : 1 - f) * 7) * T, 55 * T - 25 - Math.sin(f * Math.PI) * 90);
    }
    this.fountain.setTexture(`campus-fountain-${Math.floor(time / 320) % 3}`);
    for (const [i, leaf] of this.leaves.entries()) {
      const f = ((time + i * 670) % 5300) / 5300;
      leaf.setPosition((39 + i * 1.1) * T + Math.floor(Math.sin(f * 7 + i) * 8 / 2) * 2, (49 + f * 7) * T).setAlpha(1 - f * 0.7);
    }
    this.updateSquirrels(time, delta, player);
    this.updatePigeons(time, player);
    this.updateProfessor(time, delta, player);
  }
  private updateSquirrels(time: number, delta: number, player: Point) {
    for (const a of this.squirrels) {
      if (a.mode === "climb") {
        const f = Math.min(1, (time - (a.until - 5000)) / 800);
        a.sprite.setPosition(43.5 * T, 56 * T - Math.floor(f * 100 / 6) * 6).setDepth(56 * T + 1);
        if (time >= a.until) { a.sprite.setPosition(a.home.x, a.home.y); a.mode = "idle"; a.until = time + 2000; }
        continue;
      }
      if (a.mode === "idle" && Math.hypot(player.x - a.sprite.x, player.y - a.sprite.y) < 64 && time > a.until) {
        a.mode = "flee"; a.path = this.route(a.sprite, { x: 42, y: 55 });
      }
      if (a.path.length) { this.advance(a.sprite, a.path, a.mode === "flee" ? 230 : 70, delta); a.sprite.setTexture(`campus-squirrel-${Math.floor(time / 130) % 2}`).setDepth(a.sprite.y); }
      else if (a.mode === "flee") { a.mode = "climb"; a.until = time + 5000; }
      else if (time >= a.until) {
        const tile = { x: Math.floor(a.home.x / T) + Math.floor(this.random() * 5) - 2, y: Math.floor(a.home.y / T) + Math.floor(this.random() * 3) - 1 };
        a.path = this.route(a.sprite, tile); a.until = time + 5000;
      }
    }
  }
  private updatePigeons(time: number, player: Point) {
    for (const a of this.pigeons) {
      if (a.mode === "scatter") {
        const f = Math.min(1, (time - (a.until - 6000)) / 6000);
        const flight = Math.min(1, f * 5);
        a.sprite.setPosition(a.home.x + Math.sin(a.index * 2) * 55 * flight, a.home.y + Math.cos(a.index * 2) * 45 * flight - Math.sin(f * Math.PI) * 65).setTexture(`campus-pigeon-${Math.floor(time / 130) % 2}`).setDepth(a.home.y + 100);
        if (time >= a.until) { a.mode = "idle"; a.until = time + 1200; a.sprite.setPosition(a.home.x, a.home.y); }
      } else {
        a.sprite.setTexture("campus-pigeon-0").setAngle(Math.floor(time / (900 + a.index * 120)) % 3 === 0 ? 10 : 0).setDepth(a.sprite.y);
        if (time > a.until && Math.hypot(player.x - a.sprite.x, player.y - a.sprite.y) < 45) { a.mode = "scatter"; a.until = time + 6000; }
      }
    }
  }
  private updateProfessor(time: number, delta: number, player: Point) {
    const location = professorPlace(this.hooks.getHour());
    const following = time < this.professorUntil;
    if ((location !== this.professorLocation || this.professorReturning) && !following) {
      const anchor = PROFESSOR_ANCHORS[location];
      this.professorReturning = false;
      // Never teleport through a wall when the cat changes its daily destination.
      this.professorPath = this.route(this.professor, location === "lounge" ? { x: 9, y: 28 } : anchor);
      this.professorLocation = location;
      if (!this.professorPath.length) { const p = center(anchor); this.professor.setPosition(p.x, p.y); }
    }
    if (following && time > this.professorNext) {
      const d = Math.hypot(player.x - this.professor.x, player.y - this.professor.y);
      if (d > 35) this.professorPath = this.route(this.professor, { x: Math.floor(player.x / T), y: Math.floor(player.y / T) });
      this.professorNext = time + 450;
    } else if (!following && location !== "lounge" && !this.professorPath.length && time > this.professorNext) {
      const anchor = PROFESSOR_ANCHORS[location];
      this.professorPath = this.route(this.professor, { x: anchor.x + Math.floor(this.random() * 5) - 2, y: anchor.y + Math.floor(this.random() * 3) - 1 });
      this.professorNext = time + 6000;
    }
    this.advance(this.professor, this.professorPath, following ? 160 : 100, delta);
    if (location === "lounge" && !following && !this.professorPath.length) {
      const couch = center(PROFESSOR_ANCHORS.lounge);
      this.professor.setPosition(couch.x, couch.y - 18);
    }
    this.professor.setDepth(this.professor.y + 10).setTexture(`campus-professor-${this.professorPath.length ? Math.floor(time / 180) % 2 : 0}`);
    if (location === "lounge" && !following && !this.professorPath.length) this.professor.setAngle(-4);
    else this.professor.setAngle(0);
    const near = Math.hypot(player.x - this.professor.x, player.y - this.professor.y) < 60;
    if (near !== this.petNear) { this.petNear = near; this.hooks.onPetSpot(near); }
  }
}