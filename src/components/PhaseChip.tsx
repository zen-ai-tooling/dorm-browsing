import { useState } from "react";
import { PHASE_LABEL, type Phase } from "@/game/timeOfDay";
import { usePhase } from "@/lib/timeStore";
import { GamePanel } from "./GamePanel";
import { PixelIcon, type PixelGlyph } from "./PixelIcon";

const SUN = [
  "............",
  ".....a......",
  "..a..a..a...",
  "...XXXXX....",
  "..XooooaX...",
  "aaXooooaXaa.",
  "..XooooaX...",
  "..XaaaaaX...",
  "...XXXXX....",
  "..a..a..a...",
  ".....a......",
  "............",
];
const RISE = [
  "............",
  "............",
  "....a..a....",
  "..a......a..",
  "....XXXX....",
  "...XooooX...",
  "..XooooooX..",
  "..XooooaaX..",
  "XXXXXXXXXXXX",
  "............",
  ".aaaa..aaaa.",
  "............",
];
const SET = [
  "............",
  "............",
  "............",
  "....XXXX....",
  "...XooooX...",
  "..XooooooX..",
  "..XoooaaaX..",
  "XXXXXXXXXXXX",
  ".aaaaaaaaaa.",
  "...aaaaaa...",
  ".....aa.....",
  "............",
];
const MOON = [
  "............",
  "....XXX..a..",
  "...XooX.....",
  "..XooX......",
  "..XooX....a.",
  "..XoooX.....",
  "..XooooXXX..",
  "...XooooooX.",
  "....XXXXXX..",
  ".a..........",
  "......a.....",
  "............",
];

/** exported so the phone dock can fold a mini phase icon into the coin chip */
export const PHASE_GLYPHS: Record<Phase, PixelGlyph> = {
  morning: { icon: RISE, color: "#f6d48a", color2: "#e8a86b" },
  day: { icon: SUN, color: "#f6d06b", color2: "#e8a24f" },
  golden: { icon: SET, color: "#f39a5a", color2: "#c8765c" },
  night: { icon: MOON, color: "#f3ecd0", color2: "#9fb3e0" },
};

/** small HUD chip: pixel sun / sunset / moon for the current phase, name on hover or tap */
export const PhaseChip = () => {
  const phase = usePhase();
  const [showName, setShowName] = useState(false);
  if (!phase) return null;
  const label = PHASE_LABEL[phase];
  return (
    <button
      type="button"
      title={label}
      aria-label={`Time of day: ${label}`}
      onClick={() => setShowName((v) => !v)}
      className="rounded-[3px]"
    >
      <GamePanel className="flex items-center gap-1.5 px-2 py-1.5">
        <PixelIcon def={GLYPHS[phase]} size={18} />
        {showName ? (
          <span className="font-body text-xs font-bold text-panel-foreground">{label}</span>
        ) : null}
      </GamePanel>
    </button>
  );
};
