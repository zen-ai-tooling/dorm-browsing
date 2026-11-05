/** Real-time phases from the player's local clock. Pure: no Phaser, no React. */
export type Phase = "morning" | "day" | "golden" | "night";

export const PHASES: Phase[] = ["morning", "day", "golden", "night"];

export const PHASE_LABEL: Record<Phase, string> = {
  morning: "Morning",
  day: "Daytime",
  golden: "Golden hour",
  night: "Night",
};

export const isPhase = (v: unknown): v is Phase =>
  typeof v === "string" && (PHASES as string[]).includes(v);

/** morning 6–10, day 10–17, golden 17–20, night 20–6 (local hours) */
export const phaseFor = (date: Date): Phase => phaseForHour(date.getHours());

export const phaseForHour = (h: number): Phase => {
  if (h >= 6 && h < 10) return "morning";
  if (h >= 10 && h < 17) return "day";
  if (h >= 17 && h < 20) return "golden";
  return "night";
};

export interface PhaseLook {
  /** multiply overlay colour + strength (0 = none) */
  tint: number;
  tintAlpha: number;
  /** night darkness strength (0..1, scales DARKNESS_ALPHA) */
  night: number;
}

/** moonlit blue — the darkness RenderTexture MULTIPLIES this over the world */
export const DARKNESS_COLOR = 0x3a4686;
/** darkness strength at full night (the RT's alpha is DARKNESS_ALPHA * night) */
export const DARKNESS_ALPHA = 1;
/** how long a phase change crossfades */
export const PHASE_FADE_MS = 3000;

export const PHASE_LOOK: Record<Phase, PhaseLook> = {
  morning: { tint: 0xffe6c4, tintAlpha: 0.22, night: 0 },
  day: { tint: 0xffffff, tintAlpha: 0, night: 0 },
  golden: { tint: 0xff9a5a, tintAlpha: 0.32, night: 0 },
  night: { tint: 0xffffff, tintAlpha: 0, night: 1 },
};
