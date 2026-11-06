import { useState, type CSSProperties } from "react";
import { avatarDataUrl } from "@/lib/avatarCanvas";
import { keepCloudSave, keepLocalSave, type CloudConflict } from "@/lib/saveSync";
import { getPlayerState, type PlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import { GamePanel } from "./GamePanel";

const pixelated: CSSProperties = { imageRendering: "pixelated" };

const lastPlayed = (ms: number) => {
  if (!ms) return "never";
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const DormCard = ({ label, state, savedAtMs }: { label: string; state: PlayerState; savedAtMs: number }) => (
  <div className="flex flex-1 flex-col items-center gap-1 rounded-[3px] border-2 border-ink bg-panel-foreground/5 p-2 text-center">
    <span className="font-display text-[10px] font-bold uppercase tracking-widest text-panel-muted">{label}</span>
    <img
      src={avatarDataUrl(state.avatar, "down", 0, 3)}
      alt=""
      width={36}
      height={48}
      style={pixelated}
      className="border-2 border-ink bg-panel"
    />
    <span className="font-display text-sm font-bold text-panel-foreground">{state.playerName || "No name"}</span>
    <span className="font-body text-[11px] tabular-nums text-panel-muted">
      {state.coins} coins · {state.ownedItemIds.length} items
    </span>
    <span className="font-body text-[11px] text-panel-muted">Last played {lastPlayed(savedAtMs)}</span>
  </div>
);

/**
 * Signing into an existing account while this device has real progress: both dorms
 * side by side, never merged. Default keeps the saved (cloud) dorm.
 */
export const ConflictDialog = ({ conflict }: { conflict: CloudConflict }) => {
  const [confirmLocal, setConfirmLocal] = useState(false);
  const local = getPlayerState();

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 sm:items-center">
      <GamePanel accent="#c9a227" className="max-h-[88%] w-[min(100%,480px)] overflow-y-auto p-4">
        <h2 className="mb-1 font-display text-base font-bold text-panel-foreground">Which dorm wins?</h2>
        <p className="mb-3 font-body text-sm text-panel-muted">
          This account already has a saved dorm, and this device has its own progress. Pick one — they can't be merged.
        </p>
        <div className="mb-3 flex gap-2">
          <DormCard label="Saved dorm" state={conflict.cloudState} savedAtMs={new Date(conflict.cloudUpdatedAt).getTime()} />
          <DormCard label="This device" state={local} savedAtMs={local.savedAt} />
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.uiClick();
              keepCloudSave();
            }}
            className="rounded-[3px] border-2 border-ink bg-ink px-3 py-1.5 font-display text-sm font-bold text-panel"
          >
            Keep my saved dorm
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.uiClick();
              if (!confirmLocal) {
                setConfirmLocal(true);
                return;
              }
              keepLocalSave();
            }}
            className="rounded-[3px] border-2 border-ink bg-panel px-3 py-1.5 font-display text-sm font-bold text-panel-foreground"
          >
            {confirmLocal ? "Really overwrite the saved dorm?" : "Keep this device's dorm"}
          </button>
        </div>
      </GamePanel>
    </div>
  );
};
