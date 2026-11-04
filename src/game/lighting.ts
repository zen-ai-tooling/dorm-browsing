import * as Phaser from "phaser";
import { DARKNESS_ALPHA, DARKNESS_COLOR } from "./timeOfDay";

/**
 * Night lighting: one world-sized RenderTexture filled with darkness, with a hard-edged
 * dithered "lightmask" erased at every light source, plus an additive coloured "glow"
 * sprite per source. The darkness texture is redrawn only when a light is added, removed
 * or moved — never every frame. Phase looks (tint/darkness strength) are applied by the
 * scene through setLook().
 */

export const LIGHT_DEPTH = 4900;

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
  /** false = additive glow only (no darkness cut-out) — used for the player */
  cut?: boolean;
  /** disco ball: colored flecks orbit inside the radius at night */
  disco?: boolean;
  /** glow strength (additive alpha) */
  strength?: number;
}

export interface Light {
  spec: LightSpec;
  x: number;
  y: number;
  /** last position the darkness cut-out was drawn at */
  cutX: number;
  cutY: number;
  glow: Phaser.GameObjects.Image;
  flecks: Phaser.GameObjects.Rectangle[];
  seed: number;
}

const FLECK_COLORS = [0xf07ab8, 0x7fd1e8, 0xf2d06b, 0x9be39b, 0xc9a7f0];

/** glow/lightmask are 64px (radius 32); half-steps keep every art pixel a whole screen pixel */
const scaleFor = (radius: number) => Math.max(0.5, Math.round(radius / 16) / 2);

export class Lighting {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private tintLayer: Phaser.GameObjects.Rectangle;
  private lights = new Set<Light>();
  private dirty = true;
  private night = 0;
  private seedN = 0;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
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
      .setDepth(LIGHT_DEPTH)
      .setAlpha(0)
      .setVisible(false);
  }

  add(spec: LightSpec): Light {
    const x = (spec.follow?.x ?? spec.x) + (spec.dx ?? 0);
    const y = (spec.follow?.y ?? spec.y) + (spec.dy ?? 0);
    const glow = this.scene.add
      .image(x, y, "glow")
      .setTint(spec.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(scaleFor(spec.radius))
      .setDepth(LIGHT_DEPTH + 1)
      .setAlpha(0)
      .setVisible(false);
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
    const light: Light = { spec, x, y, cutX: x, cutY: y, glow, flecks, seed: this.seedN++ };
    this.lights.add(light);
    if (spec.cut !== false) this.dirty = true;
    this.applyGlow(light, this.scene.time.now);
    return light;
  }

  remove(light: Light | null | undefined) {
    if (!light || !this.lights.has(light)) return;
    this.lights.delete(light);
    light.glow.destroy();
    light.flecks.forEach((f) => f.destroy());
    if (light.spec.cut !== false) this.dirty = true;
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

  private applyGlow(l: Light, now: number) {
    const on = this.night > 0.003;
    l.glow.setVisible(on);
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
    l.glow.setAlpha((l.spec.strength ?? 0.32) * k * this.night);
  }

  update(now: number) {
    for (const l of this.lights) {
      const f = l.spec.follow;
      if (f) {
        if (f.active === false) continue;
        l.x = f.x + (l.spec.dx ?? 0);
        l.y = f.y + (l.spec.dy ?? 0);
        l.glow.setPosition(l.x, l.y);
        // ignore 2px idle bobs; real moves (drag, edit) redraw the cut-out
        if (l.spec.cut !== false && (Math.abs(l.x - l.cutX) > 4 || Math.abs(l.y - l.cutY) > 4))
          this.dirty = true;
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
    for (const l of this.lights) {
      if (l.spec.cut === false) continue;
      l.cutX = l.x;
      l.cutY = l.y;
      const s = scaleFor(l.spec.radius);
      rt.stamp("lightmask", null, Math.round(l.x), Math.round(l.y), {
        scale: s,
        blendMode: Phaser.BlendModes.ERASE,
      });
    }
    rt.render();
  }

  destroy() {
    for (const l of [...this.lights]) this.remove(l);
    this.rt.destroy();
    this.tintLayer.destroy();
  }
}
