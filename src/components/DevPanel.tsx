import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { devActions, useDevMode, usePlayerState } from "@/lib/playerStore";
import { signOutToGuest, useAuth } from "@/lib/auth";
import { deleteCloudSave } from "@/lib/saveSync";
import { sfx } from "@/game/sounds";
import { GamePanel, IconChip } from "./GamePanel";
import { currentHour, setHourOverride, setWeekdayOverride, useHourOverride, useTimeOverride, useWeekdayOverride } from "@/lib/timeStore";
import { PHASE_LABEL, phaseForHour } from "@/game/timeOfDay";
import { formatHour } from "@/data/residents";

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
export const DevPanel = ({
  onLayoutReset,
  onTriggerVisit,
  onCampusTeleport,
}: {
  onLayoutReset: () => void;
  onTriggerVisit: () => boolean;
  onCampusTeleport: (target: "quad" | "library" | "backyard" | "frontdoor") => void;
}) => {
  const dev = useDevMode();
  const { coins, currentStreak } = usePlayerState();
  const { userId, isAnonymous } = useAuth();
  const timeOverride = useTimeOverride();
  const hourOverride = useHourOverride();
  const weekdayOverride = useWeekdayOverride();
  const shownHour = hourOverride ?? currentHour();
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
    // wipe the cloud row too, so the new-player flow reruns on this account
    void deleteCloudSave().then(() => devActions.resetEverything()).catch(() => {
      toast("Couldn't reset your saved dorm — reconnect and reload before trying again.");
    });
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
        <div className="mb-1 flex items-baseline justify-between font-body text-xs font-bold text-panel-foreground">
          <span>Clock</span>
          <span className="tabular-nums text-panel-muted">
            {hourOverride === null ? "Auto" : formatHour(hourOverride)} · {PHASE_LABEL[phaseForHour(shownHour)]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            aria-label="Clock hour"
            value={shownHour}
            onChange={(e) => setHourOverride(Number(e.target.value))}
            className="h-2 min-w-0 flex-1 accent-[var(--color-ink)]"
          />
          <button
            type="button"
            aria-pressed={hourOverride === null && timeOverride === null}
            onClick={() => run(() => setHourOverride(null), "Clock: Auto")}
            className={`rounded-[3px] border-2 border-ink px-1.5 py-0.5 font-body text-[11px] font-bold ${
              hourOverride === null && timeOverride === null ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Auto
          </button>
        </div>
      </div>
      <div className="mb-2">
        <div className="mb-1 font-body text-xs font-bold text-panel-foreground">Weekday</div>
        <div className="flex flex-wrap gap-1">
          {(["Auto", "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const).map((label, i) => {
            const value = i === 0 ? null : i - 1;
            const active = weekdayOverride === value;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => run(() => setWeekdayOverride(value), value === null ? "Weekday: Auto" : `Weekday: ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][value]}`)}
                className={`rounded-[3px] border-2 border-ink px-1.5 py-0.5 font-body text-[11px] font-bold ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <DevButton onClick={() => run(() => onCampusTeleport("quad"), "Welcome to the Quad")}>Teleport to Quad</DevButton>
        <DevButton onClick={() => run(() => onCampusTeleport("library"), "Messing Library steps")}>Teleport to library steps</DevButton>
        <DevButton onClick={() => run(() => onCampusTeleport("backyard"), "Welcome to the Backyard")}>Teleport to Backyard</DevButton>
        <DevButton onClick={() => run(() => onCampusTeleport("frontdoor"), "Front door")}>Teleport to front door</DevButton>
        <DevButton onClick={() => run(devActions.resetFountain, "Today's fountain is ready again")}>Reset today's fountain</DevButton>
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
        <DevButton onClick={() => run(devActions.resetFriendship, "Friendship reset")}>Reset friendship</DevButton>
        <DevButton
          onClick={() => {
            devActions.allowVisitAgain();
            sfx.uiClick();
            toast(onTriggerVisit() ? "Someone's heading to your door" : "Nobody's free to visit right now");
          }}
        >
          Trigger door visit now
        </DevButton>
        <DevButton
          onClick={() =>
            run(() => {
              if (userId) void navigator.clipboard?.writeText(userId);
            }, userId ? "User id copied" : "No session yet")
          }
        >
          Copy user id{isAnonymous ? " (guest)" : ""}
        </DevButton>
        <DevButton onClick={() => run(() => void signOutToGuest(), "Signing out to a fresh guest")}>
          Sign out (dev)
        </DevButton>
        <DevButton danger onClick={resetEverything}>
          {confirmReset ? "Tap again to confirm" : "Reset everything"}
        </DevButton>
      </div>
    </GamePanel>
  );
};
