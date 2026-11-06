import * as Phaser from "phaser";
import { DARKNESS_ALPHA, DARKNESS_COLOR } from "./timeOfDay";
import { saturatedPoolColor } from "./lightColor";

/**
 * Night lighting: one world-sized RenderTexture MULTIPLIED over the world, filled with
 * a moonlit blue and erased at every light source, plus a colored additive "pool" of
 * light above the darkness so its color is not multiplied away.
 *
 * - Light textures are generated per radius bucket (8px steps) at 1:1 art pixels with
 *   3 hard-edged stepped rings — no dither, so no checkerboard rims at camera zoom.
 * - Every light is clipped to its zone (room/hall rect, face rows included) via a
 *   cropped hidden stamp image, so light never leaks through walls.
 * - The darkness texture is redrawn only when a light is added, removed, moved or
 *   faded — never every frame. Phase looks are applied by the scene through setLook().
 */

export const LIGHT_DEPTH = 4900;
/** Additive pools must remain above the multiply darkness. */
export const POOL_DEPTH = LIGHT_DEPTH + 0.5;

export interface ClipRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LightSpec {
  x: number;
  y: number;
  color: number;
  radius: number;
  /** TVs: stepped 0.85 ↔ 1 flicker */
  flicker?: boolean;
  /** string-light bulbs: 2-step twinkle, staggered by this offset (ms) */
  twinkle?: number;
  /** keep the light on a moving object (placed items, the player) */
  follow?: { x: number; y: number; active?: boolean };
  /** offset from the followed object's position */
  dx?: number;
  dy?: number;
  /** false = no darkness cut-out (rare; pools usually want a cut too) */
  cut?: boolean;
  /** false = no colored floor pool (string-light bulbs, the player halo) */
  pool?: boolean;
  /** pool center this far below the source (default: radius * 0.45) */
  poolDy?: number;
  /** pool drawn as one wide band (string-light wires) instead of a circle */
  strip?: { w: number; h: number };
  /** explicit clip rect; undefined = the zone containing the light; null = no clip */
  clip?: ClipRect | null;
  /** player halo: the cut-out fades while standing inside another light's radius */
  fadeNearOthers?: boolean;
  /** disco ball: colored flecks orbit inside the radius at night */
  disco?: boolean;
  /** pool strength multiplier (1 → alpha 0.2 at full night) */
  strength?: number;
}

export interface Light {
  spec: LightSpec;
  x: number;
  y: number;
  /** last position the darkness cut-out was drawn at */
  cutX: number;
  cutY: number;
  cutAlpha: number;
  drawnCutAlpha: number;
  pool: Phaser.GameObjects.Image | null;
  flecks: Phaser.GameObjects.Rectangle[];
  seed: number;
}

const FLECK_COLORS = [0xf07ab8, 0x7fd1e8, 0xf2d06b, 0x9be39b, 0xc9a7f0];
const POOL_ALPHA = 0.22;
/** dim warm "ceiling light" erase for rooms with someone home and awake */
const AMBIENT_ALPHA = 0.35;
/** pool ellipses are squashed vertically so they sit on the floor in this perspective */
const POOL_SQUASH = 0.87;

/** light textures come in 8px radius buckets so every art pixel stays whole */
const bucketFor = (radius: number) => Math.max(8, Math.round(radius / 8) * 8);

export class Lighting {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private tintLayer: Phaser.GameObjects.Rectangle;
  private lights = new Set<Light>();
  /** dim erase rects for lived-in rooms, keyed by zone id */
  private ambients = new Map<string, ClipRect>();
  /** zone clip rects (world px, face rows included) for lights without an explicit clip */
  private zones: ClipRect[];
  /** hidden stamp reused for every cut-out (invisible objects still draw into an RT) */
  private stamp: Phaser.GameObjects.Image;
  /** hidden rect reused for ambient room fills */
  private rectStamp: Phaser.GameObjects.Rectangle;
  private dirty = true;
  private night = 0;
  private seedN = 0;

  constructor(scene: Phaser.Scene, width: number, height: number, zones: ClipRect[]) {
    this.scene = scene;
    this.zones = zones;
    this.tintLayer = scene.add
      .rectangle(0, 0, width, height, 0xffffff, 1)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(LIGHT_DEPTH - 1)
      .setAlpha(0)
      .setVisible(false);
    this.rt = scene.add
      .renderTexture(0, 0, width, height)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(LIGHT_DEPTH)
      .setAlpha(0)
      .setVisible(false);
    this.ensureTextures(8);
    this.stamp = scene.add.image(-9999, -9999, "light-m-8").setVisible(false);
    this.rectStamp = scene.add.rectangle(-9999, -9999, 4, 4, 0xffffff, 1).setVisible(false);
  }

  /** stepped-ring textures: `light-m-<r>` cut mask, `light-p-<r>` floor pool, `light-strip` band */
  private ensureTextures(bucket: number) {
    const mKey = `light-m-${bucket}`;
    const pKey = `light-p-${bucket}`;
    const S = bucket * 2;
    const c = bucket;
    if (!this.scene.textures.exists(mKey)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      for (let y = 0; y < S; y += 2)
        for (let x = 0; x < S; x += 2) {
          const d = Math.hypot(x + 1 - c, y + 1 - c);
          const a = d < bucket * 0.55 ? 1 : d < bucket * 0.78 ? 0.7 : d < bucket ? 0.38 : 0;
          if (a > 0) g.fillStyle(0xffffff, a).fillRect(x, y, 2, 2);
        }
      g.generateTexture(mKey, S, S);
      g.destroy();
    }
    if (!this.scene.textures.exists(pKey)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      for (let y = 0; y < S; y += 2)
        for (let x = 0; x < S; x += 2) {
          const d = Math.hypot(x + 1 - c, (y + 1 - c) / POOL_SQUASH);
          const a = d < bucket * 0.42 ? 1 : d < bucket * 0.72 ? 0.55 : d < bucket ? 0.25 : 0;
          if (a > 0) g.fillStyle(0xffffff, a).fillRect(x, y, 2, 2);
        }
      g.generateTexture(pKey, S, S);
      g.destroy();
    }
    if (!this.scene.textures.exists("light-strip")) {
      const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
      for (let y = 0; y < 16; y += 2) {
        const d = Math.abs(y + 1 - 8);
        const a = d < 3 ? 1 : d < 6 ? 0.5 : 0.22;
        g.fillStyle(0xffffff, a).fillRect(0, y, 64, 2);
      }
      g.generateTexture("light-strip", 64, 16);
      g.destroy();
    }
  }

  add(spec: LightSpec): Light {
    const x = (spec.follow?.x ?? spec.x) + (spec.dx ?? 0);
    const y = (spec.follow?.y ?? spec.y) + (spec.dy ?? 0);
    const bucket = bucketFor(spec.radius);
    this.ensureTextures(bucket);
    let pool: Phaser.GameObjects.Image | null = null;
    if (spec.pool !== false) {
      pool = this.scene.add
        .image(x, y, spec.strip ? "light-strip" : `light-p-${bucket}`)
        .setTint(saturatedPoolColor(spec.color))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(POOL_DEPTH)
        .setAlpha(0)
        .setVisible(false);
      if (spec.strip) pool.setScale(spec.strip.w / 64, spec.strip.h / 16);
    }
    const flecks: Phaser.GameObjects.Rectangle[] = [];
    if (spec.disco)
      for (let i = 0; i < 6; i++)
        flecks.push(
          this.scene.add
            .rectangle(x, y, 4, 4, FLECK_COLORS[i % FLECK_COLORS.length]!, 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(LIGHT_DEPTH + 1)
            .setVisible(false),
        );
    const light: Light = {
      spec,
      x,
      y,
      cutX: x,
      cutY: y,
      cutAlpha: 1,
      drawnCutAlpha: -1,
      pool,
      flecks,
      seed: this.seedN++,
    };
    if (pool) this.positionPool(light);
    this.lights.add(light);
    if (spec.cut !== false) this.dirty = true;
    this.applyGlow(light, this.scene.time.now);
    return light;
  }

  remove(light: Light | null | undefined) {
    if (!light || !this.lights.has(light)) return;
    this.lights.delete(light);
    light.pool?.destroy();
    light.flecks.forEach((f) => f.destroy());
    if (light.spec.cut !== false) this.dirty = true;
  }

  /** a dim "ceiling light" erase for a lived-in room; null turns it off */
  setAmbient(key: string, rect: ClipRect | null) {
    const had = this.ambients.has(key);
    if (rect) {
      const prev = this.ambients.get(key);
      if (prev && prev.x === rect.x && prev.y === rect.y && prev.w === rect.w && prev.h === rect.h) return;
      this.ambients.set(key, rect);
    } else {
      if (!had) return;
      this.ambients.delete(key);
    }
    this.dirty = true;
  }

  /** phase look: multiply tint (morning/golden) + darkness strength (night), both 0..1 blends */
  setLook(tint: number, tintAlpha: number, night: number) {
    this.tintLayer.setFillStyle(tint, 1).setAlpha(tintAlpha).setVisible(tintAlpha > 0.003);
    const wasOff = this.night <= 0.003;
    this.night = night;
    const on = night > 0.003;
    this.rt.setAlpha(DARKNESS_ALPHA * night).setVisible(on);
    if (on && wasOff) this.dirty = true;
    const now = this.scene.time.now;
    for (const l of this.lights) this.applyGlow(l, now);
  }

  get nightAmount() {
    return this.night;
  }

  private zoneAt(x: number, y: number): ClipRect | null {
    return this.zones.find((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) ?? null;
  }

  private clipFor(l: Light): ClipRect | null {
    if (l.spec.clip !== undefined) return l.spec.clip;
    return this.zoneAt(l.x, l.y);
  }

  /** crops a pool image to the light's zone and centers it on the floor below the source */
  private positionPool(l: Light) {
    const pool = l.pool;
    if (!pool) return;
    const py = l.y + (l.spec.poolDy ?? (l.spec.strip ? 0 : l.spec.radius * 0.45));
    const texW = l.spec.strip ? 64 : bucketFor(l.spec.radius) * 2;
    const texH = l.spec.strip ? 16 : bucketFor(l.spec.radius) * 2;
    const hw = (texW * pool.scaleX) / 2;
    const hh = (texH * pool.scaleY) / 2;
    const clip = this.clipFor(l);
    if (!clip) {
      pool.setCrop().setPosition(l.x, py);
      return;
    }
    const ix0 = Math.max(l.x - hw, clip.x);
    const ix1 = Math.min(l.x + hw, clip.x + clip.w);
    const iy0 = Math.max(py - hh, clip.y);
    const iy1 = Math.min(py + hh, clip.y + clip.h);
    if (ix1 <= ix0 || iy1 <= iy0) {
      pool.setVisible(false);
      return;
    }
    pool
      .setCrop((ix0 - (l.x - hw)) / pool.scaleX, (iy0 - (py - hh)) / pool.scaleY, (ix1 - ix0) / pool.scaleX, (iy1 - iy0) / pool.scaleY)
      .setPosition((ix0 + ix1) / 2, (iy0 + iy1) / 2);
  }

  private applyGlow(l: Light, now: number) {
    const on = this.night > 0.003;
    if (l.pool) {
      l.pool.setVisible(on);
      l.flecks.forEach((f) => f.setVisible(on));
      if (!on) return;
      let k = 1;
      if (l.spec.flicker) {
        // stepped, irregular: hold a level for ~200ms, pseudo-random from the step index
        const step = Math.floor((now + l.seed * 97) / 210);
        k = ((step * 2654435761) >>> 0) % 5 === 0 ? 0.85 : 1;
      } else if (l.spec.twinkle !== undefined) {
        k = Math.floor((now + l.spec.twinkle) / 700) % 2 === 0 ? 1 : 0.55;
      }
      l.pool.setAlpha(POOL_ALPHA * (l.spec.strength ?? 1) * k * this.night);
    } else {
      l.flecks.forEach((f) => f.setVisible(on));
    }
  }

  update(now: number) {
    for (const l of this.lights) {
      const f = l.spec.follow;
      if (f) {
        if (f.active === false) continue;
        const nx = f.x + (l.spec.dx ?? 0);
        const ny = f.y + (l.spec.dy ?? 0);
        if (nx !== l.x || ny !== l.y) {
          l.x = nx;
          l.y = ny;
          if (l.pool) this.positionPool(l);
          // ignore 2px idle bobs; real moves (drag, edit) redraw the cut-out
          if (l.spec.cut !== false && (Math.abs(l.x - l.cutX) > 4 || Math.abs(l.y - l.cutY) > 4))
            this.dirty = true;
        }
      }
      if (l.spec.fadeNearOthers) {
        let near = [...this.ambients.values()].some((r) =>
          l.x >= r.x && l.x < r.x + r.w && l.y >= r.y && l.y < r.y + r.h);
        for (const o of this.lights) {
          if (o === l || o.spec.cut === false) continue;
          if (Math.hypot(o.x - l.x, o.y - l.y) < o.spec.radius * 0.9) {
            near = true;
            break;
          }
        }
        const target = near ? 0 : 1;
        if (Math.abs(l.cutAlpha - target) > 0.01) {
          l.cutAlpha = Phaser.Math.Linear(l.cutAlpha, target, 0.12);
          if (Math.abs(l.cutAlpha - target) <= 0.01) l.cutAlpha = target;
          if (Math.abs(l.cutAlpha - l.drawnCutAlpha) > 0.2 || l.cutAlpha === target) this.dirty = true;
        }
      }
      if (this.night > 0.003) {
        this.applyGlow(l, now);
        if (l.flecks.length) {
          const r = l.spec.radius * 0.75;
          l.flecks.forEach((fl, i) => {
            const a = now / 2600 + (i / l.flecks.length) * Math.PI * 2;
            const rr = r * (0.55 + 0.45 * ((i % 3) / 2));
            // snap to the 2px art grid so flecks stay pixel-crisp
            fl.setPosition(
              Math.round((l.x + Math.cos(a) * rr) / 2) * 2,
              Math.round((l.y + 26 + Math.sin(a) * rr * 0.55) / 2) * 2,
            ).setAlpha(0.7 * this.night);
          });
        }
      }
    }
    if (this.dirty && this.night > 0.003) this.redraw();
  }

  private redraw() {
    this.dirty = false;
    const rt = this.rt;
    rt.clear();
    rt.fill(DARKNESS_COLOR, 1);
    // lived-in rooms get a dim warm erase over their whole floor
    for (const r of this.ambients.values()) {
      this.rectStamp
        .setPosition(r.x + r.w / 2, r.y + r.h / 2)
        .setSize(r.w, r.h)
        .setFillStyle(0xffffff, AMBIENT_ALPHA);
      rt.erase(this.rectStamp);
    }
    for (const l of this.lights) {
      if (l.spec.cut === false) continue;
      l.drawnCutAlpha = l.cutAlpha;
      if (l.cutAlpha <= 0.01) continue;
      l.cutX = l.x;
      l.cutY = l.y;
      l.drawnCutAlpha = l.cutAlpha;
      const b = bucketFor(l.spec.radius);
      const S = b * 2;
      this.stamp.setTexture(`light-m-${b}`).setAlpha(l.cutAlpha);
      const clip = this.clipFor(l);
      let cx = l.x;
      let cy = l.y;
      if (clip) {
        const ix0 = Math.max(l.x - b, clip.x);
        const ix1 = Math.min(l.x + b, clip.x + clip.w);
        const iy0 = Math.max(l.y - b, clip.y);
        const iy1 = Math.min(l.y + b, clip.y + clip.h);
        if (ix1 <= ix0 || iy1 <= iy0) continue;
        this.stamp.setCrop(ix0 - (l.x - b), iy0 - (l.y - b), ix1 - ix0, iy1 - iy0);
        cx = (ix0 + ix1) / 2;
        cy = (iy0 + iy1) / 2;
      } else this.stamp.setCrop();
      this.stamp.setPosition(cx, cy);
      rt.erase(this.stamp);
    }
    rt.render();
  }

  destroy() {
    for (const l of [...this.lights]) this.remove(l);
    this.stamp.destroy();
    this.rectStamp.destroy();
    this.rt.destroy();
    this.tintLayer.destroy();
  }
}
