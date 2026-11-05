import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ITEM_CATALOG } from "@/data/items";
import { QUESTS, type QuestId } from "@/data/quests";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import { GamePanel, IconChip } from "./GamePanel";

const rewardLabel = (q: (typeof QUESTS)[number]) =>
  q.itemId ? `Free ${ITEM_CATALOG[q.itemId]?.category ?? "gift"}` : `+${q.coins}`;

/** "Welcome to Floor 3": first-session checklist. Bottom-left card on desktop, a chip on mobile. */
export const WelcomeQuests = ({ hidden = false, docked = false }: { hidden?: boolean; docked?: boolean }) => {
  // phones: the chip sits just above the bottom dock instead of under the top-left HUD
  const mobilePos = docked
    ? "max-sm:left-2 max-sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
    : "max-sm:bottom-auto max-sm:top-48";
  const { questsDone, questsCelebrated } = usePlayerState();
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState<QuestId | null>(null);
  const prev = useRef<string[] | null>(null);
  const done = new Set(questsDone);
  const count = QUESTS.filter((q) => done.has(q.id)).length;
  const all = count === QUESTS.length;

  // a coin pop on whichever quest just ticked (never on first render)
  useEffect(() => {
    const before = prev.current;
    prev.current = questsDone;
    if (!before) return;
    const fresh = questsDone.find((id) => !before.includes(id)) as QuestId | undefined;
    if (!fresh) return;
    setPop(fresh);
    const t = window.setTimeout(() => setPop(null), 1200);
    return () => window.clearTimeout(t);
  }, [questsDone]);

  if (questsCelebrated || hidden) return null;

  if (all)
    return (
      <div className={`pointer-events-auto absolute bottom-4 left-4 z-30 w-60 ${mobilePos}`}>
        <GamePanel accent="#c9a227" className="p-3">
          <div className="flex items-center gap-2">
            <IconChip>
              <Sparkles className="size-3.5" aria-hidden />
            </IconChip>
            <span className="font-display text-sm font-bold text-panel-foreground">Welcome to Floor 3 ✓</span>
          </div>
          <p className="mt-1 font-body text-xs text-panel-muted">You're all moved in. See you at tomorrow's question.</p>
          <div aria-hidden className="mt-1 flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="size-2 border border-ink bg-[var(--tag-premium)]"
                style={{ animation: `shop-hop 500ms steps(2) ${i * 90}ms infinite alternate` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.uiClick();
              playerActions.markQuestsCelebrated();
            }}
            className="mt-2 w-full rounded-[3px] border-2 border-ink bg-primary px-2 py-1 font-display text-xs font-bold text-primary-foreground"
          >
            Thanks!
          </button>
        </GamePanel>
      </div>
    );

  const list = (
    <ul className="mt-2 space-y-1">
      {QUESTS.map((q) => {
        const ok = done.has(q.id);
        return (
          <li key={q.id} className="relative flex items-center gap-2">
            <span
              className={`flex size-4 shrink-0 items-center justify-center border-2 border-ink ${
                ok ? "bg-primary text-primary-foreground" : "bg-panel"
              }`}
            >
              {ok ? <Check className="size-3" strokeWidth={4} aria-hidden /> : null}
            </span>
            <span
              className={`min-w-0 flex-1 font-body text-[11px] font-semibold leading-tight ${
                ok ? "text-panel-muted line-through" : "text-panel-foreground"
              }`}
            >
              {q.title}
            </span>
            <span className="shrink-0 font-display text-[10px] font-bold text-panel-muted">{rewardLabel(q)}</span>
            {pop === q.id ? (
              <span
                aria-hidden
                className="pointer-events-none absolute -top-3 right-0 font-display text-xs font-bold text-[var(--tag-premium)] [text-shadow:1px_1px_0_var(--color-ink)]"
                style={{ animation: "coin-fly 1100ms steps(6) forwards", ["--dx" as string]: "0px", ["--dy" as string]: "-18px" }}
              >
                {q.itemId ? "gift!" : `+${q.coins}`}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={`pointer-events-auto absolute bottom-4 left-4 z-30 w-60 max-sm:w-auto max-sm:max-w-[16rem] ${mobilePos}`}>
      <GamePanel accent="#7f9c86" className="p-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            sfx.uiClick();
            setOpen((v) => !v);
          }}
          className="flex w-full items-center justify-between gap-2 text-left sm:pointer-events-none"
        >
          <span className="font-display text-xs font-bold uppercase tracking-wider text-panel-foreground">
            Welcome to Floor 3
          </span>
          <span className="flex items-center gap-1 font-body text-[11px] font-bold tabular-nums text-panel-muted">
            {count}/{QUESTS.length}
            <span className="sm:hidden">
              {open ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
            </span>
          </span>
        </button>
        <div className={open ? "" : "max-sm:hidden"}>{list}</div>
      </GamePanel>
    </div>
  );
};
