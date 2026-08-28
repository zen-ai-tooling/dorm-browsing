import { useState } from "react";
import { COMMUNITY_CORKBOARD, MOODS, type PopupPayload } from "@/data/dorm";
import { DAILY_COIN_REWARD, promptForToday, todayKey } from "@/data/prompts";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { GamePanel } from "./GamePanel";

const Shell = ({
  accent,
  title,
  subtitle,
  interactive,
  children,
}: {
  accent: string;
  title: string;
  subtitle?: string;
  interactive?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={`absolute bottom-5 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
      interactive ? "pointer-events-auto" : "pointer-events-none"
    }`}
    role="status"
    aria-live="polite"
  >
    <GamePanel accent={accent} className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-wide text-panel-foreground">
          {title}
        </h2>
        {subtitle ? (
          <span
            className="font-display text-xs font-bold uppercase tracking-wider"
            style={{ color: accent }}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="mt-2 font-body text-sm text-panel-muted">{children}</div>
      <p className="mt-3 font-body text-xs italic text-panel-muted/80">walk away to close</p>
    </GamePanel>
  </div>
);

const CorkboardPopup = () => {
  const { lastDailyAnswerDate } = usePlayerState();
  const [justAnswered, setJustAnswered] = useState<string | null>(null);
  const answeredToday = lastDailyAnswerDate === todayKey();
  const prompt = promptForToday();

  if (answeredToday) {
    return (
      <Shell accent="#8d8090" title={COMMUNITY_CORKBOARD.title} subtitle="floor-wide">
        {justAnswered ? (
          <p className="font-display font-bold text-panel-foreground">
            “{justAnswered}” pinned · +{DAILY_COIN_REWARD} coins
          </p>
        ) : null}
        <ul className="mt-1 space-y-1">
          {COMMUNITY_CORKBOARD.items.map((i) => (
            <li key={i}>· {i}</li>
          ))}
        </ul>
      </Shell>
    );
  }

  return (
    <Shell accent="#c9a227" title="Question of the day" subtitle={`+${DAILY_COIN_REWARD} coins`} interactive>
      <p className="font-body font-semibold text-panel-foreground">{prompt.question}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompt.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setJustAnswered(opt);
              playerActions.answerDaily();
            }}
            className="rounded-[3px] border-2 border-ink bg-panel px-3 py-1.5 font-display text-xs font-bold text-panel-foreground transition hover:bg-ink hover:text-panel"
          >
            {opt}
          </button>
        ))}
      </div>
    </Shell>
  );
};

export const DormPopup = ({ payload }: { payload: PopupPayload | null }) => {
  if (!payload) return null;

  if (payload.kind === "songs") {
    const room = payload.room;
    return (
      <Shell accent={room.accentColor} title={`${room.name} — Top 5`} subtitle={MOODS[room.mood].label}>
        <ol className="space-y-1">
          {room.songs.map((s, i) => (
            <li key={s.title} className="flex gap-2">
              <span className="w-4 shrink-0 font-display tabular-nums opacity-60">{i + 1}</span>
              <span className="font-semibold text-panel-foreground">{s.title}</span>
              <span className="opacity-80">· {s.artist}</span>
            </li>
          ))}
        </ol>
      </Shell>
    );
  }

  if (payload.kind === "bulletin") {
    const room = payload.room;
    return (
      <Shell accent={room.accentColor} title={`${room.name} — Bulletin board`}>
        <div className="flex gap-3">
          <div
            className="pixel-corkboard h-20 w-20 shrink-0 rounded-[3px] border-2 border-ink"
            aria-label="pinned photo placeholder"
          />
          <ul className="space-y-1">
            {room.bulletin.interests.map((i) => (
              <li key={i}>· {i}</li>
            ))}
            <li className="font-display font-bold text-panel-foreground">📌 {room.bulletin.event}</li>
          </ul>
        </div>
      </Shell>
    );
  }

  if (payload.kind === "companion") {
    const c = payload.room.companion;
    return (
      <Shell accent={payload.room.accentColor} title={c.name} subtitle={c.breed}>
        <p>{c.blurb}</p>
      </Shell>
    );
  }

  if (payload.kind === "corkboard") return <CorkboardPopup />;

  return (
    <Shell accent={payload.accent ?? "#8d8090"} title={payload.title}>
      <ul className="space-y-1">
        {payload.lines.map((l) => (
          <li key={l}>· {l}</li>
        ))}
      </ul>
    </Shell>
  );
};
