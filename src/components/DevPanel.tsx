import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { devActions, useDevMode, usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import { GamePanel, IconChip } from "./GamePanel";
import { setTimeOverride, useTimeOverride } from "@/lib/timeStore";
import type { Phase } from "@/game/timeOfDay";

const TIME_OPTIONS: Array<[Phase | null, string]> = [
  [null, "Auto"],
  ["morning", "Morning"],
  ["day", "Day"],
  ["golden", "Golden"],
  ["night", "Night"],
];

const DevButton = ({
  onClick,
  children,
  danger = false,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-[3px] border-2 border-ink px-2 py-1 text-left font-body text-xs font-bold transition-transform active:translate-y-px ${
      danger ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    }`}
  >
    {children}
  </button>
);

/** Dev-only test tools; rendered only when the dorm-vibes-dev key is set. */
export const DevPanel = ({ onLayoutReset }: { onLayoutReset: () => void }) => {
  const dev = useDevMode();
  const { coins, currentStreak } = usePlayerState();
  const timeOverride = useTimeOverride();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!dev.enabled) return null;

  const run = (fn: () => void, message: string) => {
    sfx.uiClick();
    fn();
    toast(message);
  };

  const resetEverything = () => {
    sfx.uiClick();
    if (!confirmReset) {
      setConfirmReset(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    toast("Save cleared — reloading");
    devActions.resetEverything();
  };

  if (!open)
    return (
      <button
        type="button"
        aria-label="Open dev tools"
        onClick={() => {
          sfx.uiClick();
          setOpen(true);
        }}
        className="absolute bottom-3 right-3 z-40 rounded-[3px]"
      >
        <GamePanel className="flex items-center gap-1.5 px-2 py-1">
          <IconChip>
            <Wrench className="size-3" aria-hidden />
          </IconChip>
          <span className="font-display text-xs font-bold text-panel-foreground">DEV</span>
        </GamePanel>
      </button>
    );

  return (
    <GamePanel className="absolute bottom-3 right-3 z-40 w-56 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-panel-foreground">Dev tools</span>
        <button
          type="button"
          aria-label="Close dev tools"
          onClick={() => {
            sfx.uiClick();
            setOpen(false);
          }}
        >
          <IconChip>
            <X className="size-3" aria-hidden />
          </IconChip>
        </button>
      </div>
      <p className="mb-2 font-body text-[11px] text-panel-muted">
        Real balance: <span className="font-bold tabular-nums">{coins}</span> · streak {currentStreak}
      </p>
      <label className="mb-2 flex items-center justify-between gap-2 font-body text-xs font-bold text-panel-foreground">
        Unlimited coins
        <Switch
          checked={dev.unlimited}
          onCheckedChange={(on) =>
            run(() => devActions.setUnlimited(on), on ? "Unlimited coins on" : "Unlimited coins off")
          }
        />
      </label>
      <div className="mb-2">
        <span className="mb-1 block font-body text-xs font-bold text-panel-foreground">Time of day</span>
        <div className="flex flex-wrap gap-1">
          {TIME_OPTIONS.map(([value, label]) => {
            const on = timeOverride === value;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => run(() => setTimeOverride(value), `Time: ${label}`)}
                className={`rounded-[3px] border-2 border-ink px-1.5 py-0.5 font-body text-[11px] font-bold ${
                  on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <DevButton onClick={() => run(() => devActions.addCoins(500), "+500 coins")}>+500 coins</DevButton>
        <DevButton onClick={() => run(devActions.zeroCoins, "Coins set to 0 · unlimited off")}>
          Coins → 0
        </DevButton>
        <DevButton onClick={() => run(devActions.unlockAll, "Everything unlocked")}>
          Unlock everything
        </DevButton>
        <DevButton
          onClick={() =>
            run(() => {
              devActions.resetPurchases();
              onLayoutReset();
            }, "Purchases reset")
          }
        >
          Reset purchases
        </DevButton>
        <DevButton onClick={() => run(devActions.allowDailyAgain, "Today's daily is open again")}>
          Allow today's daily again
        </DevButton>
        <DevButton onClick={() => run(devActions.resetStreak, "Streak reset")}>Reset streak</DevButton>
        <DevButton onClick={() => run(devActions.resetPackage, "Today's package is back in the cubby")}>
          Reset today's package
        </DevButton>
        <DevButton onClick={() => run(devActions.resetQuests, "Welcome quests reset")}>Reset quests</DevButton>
        <DevButton onClick={() => run(devActions.replayMoveIn, "Move-in starting")}>Replay move-in</DevButton>
        <DevButton danger onClick={resetEverything}>
          {confirmReset ? "Tap again to confirm" : "Reset everything"}
        </DevButton>
      </div>
    </GamePanel>
  );
};
