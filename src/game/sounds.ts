/**
 * Procedural retro SFX — no audio files. Every sound is a short OscillatorNode
 * through a GainNode envelope (fast attack, short decay = 8-bit blip shape).
 * The AudioContext is created lazily on the first user gesture so browsers
 * never log an autoplay warning.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let footFlip = 0;

const MASTER_VOLUME = 0.18;

type Ctor = typeof AudioContext;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const C: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);
  return ctx;
};

/** call from a pointer/key handler — creates or resumes the context */
export const unlockAudio = () => {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
};

export const setSfxMuted = (v: boolean) => {
  muted = v;
};
export const isSfxMuted = () => muted;

interface Blip {
  freq: number;
  /** seconds from now */
  at?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  /** optional glide target */
  to?: number;
}

const play = (blips: Blip[]) => {
  if (muted) return;
  const c = getCtx();
  if (!c || !master || c.state === "suspended") return;
  const now = c.currentTime;
  for (const b of blips) {
    const at = now + (b.at ?? 0);
    const dur = b.dur ?? 0.09;
    const osc = c.createOscillator();
    osc.type = b.type ?? "square";
    osc.frequency.setValueAtTime(b.freq, at);
    if (b.to) osc.frequency.linearRampToValueAtTime(b.to, at + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(b.gain ?? 0.5, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
};

export const sfx = {
  /** alternating soft low tick for left/right steps */
  footstep() {
    footFlip ^= 1;
    play([{ freq: footFlip ? 104 : 92, dur: 0.055, gain: 0.22, type: "triangle" }]);
  },
  popupOpen() {
    play([
      { freq: 523, dur: 0.08, gain: 0.3, type: "triangle" },
      { freq: 784, at: 0.07, dur: 0.11, gain: 0.26, type: "triangle" },
    ]);
  },
  coin() {
    play([
      { freq: 660, dur: 0.07, gain: 0.32 },
      { freq: 880, at: 0.065, dur: 0.07, gain: 0.3 },
      { freq: 1175, at: 0.13, dur: 0.12, gain: 0.28 },
    ]);
  },
  purchase() {
    play([
      { freq: 392, dur: 0.1, gain: 0.34, type: "sawtooth" },
      { freq: 587, at: 0.09, dur: 0.16, gain: 0.3, type: "triangle", to: 622 },
    ]);
  },
  uiClick() {
    play([{ freq: 320, dur: 0.035, gain: 0.16, type: "square" }]);
  },
  placeItem() {
    play([{ freq: 180, to: 120, dur: 0.09, gain: 0.3, type: "triangle" }]);
  },
  removeItem() {
    play([{ freq: 300, to: 150, dur: 0.1, gain: 0.26, type: "square" }]);
  },
};
