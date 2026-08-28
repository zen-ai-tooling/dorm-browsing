import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Pencil, Plus, Tv, X } from "lucide-react";
import {
  COMMUNITY_CORKBOARD,
  MOODS,
  type PersonRoom,
  type PopupPayload,
  type Song,
} from "@/data/dorm";
import { DAILY_COIN_REWARD, promptForToday, todayKey } from "@/data/prompts";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { GamePanel, IconChip } from "./GamePanel";
import { sfx } from "@/game/sounds";

const MY_ROOM_ID = "room-1";
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const Shell = ({
  accent,
  title,
  subtitle,
  interactive,
  onEdit,
  editing,
  children,
}: {
  accent: string;
  title: string;
  subtitle?: string;
  interactive?: boolean;
  onEdit?: () => void;
  editing?: boolean;
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
        <div className="flex items-center gap-2">
          {subtitle ? (
            <span
              className="font-display text-xs font-bold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {subtitle}
            </span>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              aria-label={editing ? "Cancel editing" : "Edit this"}
              onClick={() => {
                sfx.uiClick();
                onEdit();
              }}
            >
              <IconChip>
                {editing ? (
                  <X className="size-3.5" aria-hidden />
                ) : (
                  <Pencil className="size-3.5" aria-hidden />
                )}
              </IconChip>
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 font-body text-sm text-panel-muted">{children}</div>
      <p className="mt-3 font-body text-xs italic text-panel-muted/80">
        {interactive ? "tap outside the panel or walk away to close" : "walk away to close"}
      </p>
    </GamePanel>
  </div>
);

const inputClass =
  "min-w-0 flex-1 rounded-[3px] border-2 border-ink bg-panel px-2 py-1 font-body text-xs text-panel-foreground outline-none focus:bg-panel-foreground/5";

const SaveBar = ({ onSave }: { onSave: () => void }) => (
  <button
    type="button"
    onClick={() => {
      sfx.uiClick();
      onSave();
    }}
    className="mt-3 w-full rounded-[3px] border-2 border-ink bg-ink px-3 py-1.5 font-display text-xs font-bold text-panel transition hover:opacity-90"
  >
    Save
  </button>
);

const MiniChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" aria-label={label} onClick={onClick}>
    <IconChip className="size-6">
      {label === "Move up" ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : label === "Move down" ? (
        <ArrowDown className="size-3" aria-hidden />
      ) : label === "Add" ? (
        <Plus className="size-3" aria-hidden />
      ) : (
        <X className="size-3" aria-hidden />
      )}
    </IconChip>
  </button>
);

/* ---------------- songs ---------------- */

const Equalizer = ({ color }: { color: string }) => (
  <span className="flex h-5 w-5 items-end justify-center gap-[2px]" aria-hidden>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-[3px] animate-pulse"
        style={{
          backgroundColor: color,
          height: `${[8, 14, 11][i]}px`,
          animationDuration: `${[700, 1000, 850][i]}ms`,
        }}
      />
    ))}
  </span>
);

const SongsView = ({ room, songs }: { room: PersonRoom; songs: Song[] }) => {
  const mood = MOODS[room.mood];
  const swatches = [mood.posterAccent, mood.glow, mood.wall, mood.wallpaper, mood.posterAccent];
  return (
    <ol className="space-y-1.5">
      {songs.map((s, i) => (
        <li key={`${s.title}-${i}`} className="flex items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center border-2 border-ink"
            style={{ backgroundColor: hex(swatches[i % swatches.length]!) }}
          >
            {i === 0 && room.isActive ? (
              <Equalizer color="#241c26" />
            ) : (
              <span className="font-body text-xs font-bold tabular-nums text-ink/70">{i + 1}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-bold text-panel-foreground">
              {s.title || "—"}
            </span>
            <span className="block truncate font-body text-xs text-panel-muted">{s.artist}</span>
          </span>
        </li>
      ))}
    </ol>
  );
};

const SongsEdit = ({ songs, onSave }: { songs: Song[]; onSave: (s: Song[]) => void }) => {
  const [draft, setDraft] = useState<Song[]>(() =>
    Array.from({ length: 5 }, (_, i) => songs[i] ?? { title: "", artist: "" }),
  );
  const swap = (a: number, b: number) => {
    if (b < 0 || b >= draft.length) return;
    const next = [...draft];
    [next[a], next[b]] = [next[b]!, next[a]!];
    setDraft(next);
  };
  return (
    <div>
      <div className="space-y-1.5">
        {draft.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="font-body text-xs font-bold tabular-nums text-panel-muted">{i + 1}</span>
            <input
              className={inputClass}
              value={s.title}
              placeholder="Title"
              onChange={(e) =>
                setDraft(draft.map((d, j) => (j === i ? { ...d, title: e.target.value } : d)))
              }
            />
            <input
              className={inputClass}
              value={s.artist}
              placeholder="Artist"
              onChange={(e) =>
                setDraft(draft.map((d, j) => (j === i ? { ...d, artist: e.target.value } : d)))
              }
            />
            <MiniChip label="Move up" onClick={() => swap(i, i - 1)} />
            <MiniChip label="Move down" onClick={() => swap(i, i + 1)} />
          </div>
        ))}
      </div>
      <SaveBar onSave={() => onSave(draft)} />
    </div>
  );
};

/* ---------------- bulletin ---------------- */

const BulletinView = ({
  accent,
  bulletin,
}: {
  accent: string;
  bulletin: { interests: string[]; event: string };
}) => (
  <div className="space-y-3">
    <div className="pixel-corkboard flex flex-wrap gap-2 border-2 border-ink p-2">
      {bulletin.interests.length === 0 ? (
        <span className="font-body text-xs italic text-panel-muted">nothing pinned yet</span>
      ) : null}
      {bulletin.interests.map((i, idx) => (
        <span
          key={`${i}-${idx}`}
          className="relative border-2 border-ink bg-panel px-2 py-1 font-body text-xs text-panel-foreground shadow-[2px_2px_0_0_rgba(36,28,38,0.35)]"
          style={{ transform: `rotate(${idx % 2 === 0 ? -1.5 : 1.5}deg)` }}
        >
          <span
            aria-hidden
            className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 border-2 border-ink"
            style={{ backgroundColor: accent }}
          />
          {i}
        </span>
      ))}
    </div>
    <div
      className="flex items-center gap-2 border-2 border-ink px-2 py-1.5"
      style={{ backgroundColor: accent }}
    >
      <CalendarDays className="size-4 shrink-0 text-ink" aria-hidden />
      <span className="font-display text-sm font-bold text-ink">{bulletin.event}</span>
    </div>
  </div>
);

const BulletinEdit = ({
  bulletin,
  onSave,
}: {
  bulletin: { interests: string[]; event: string };
  onSave: (b: { interests: string[]; event: string }) => void;
}) => {
  const [interests, setInterests] = useState<string[]>(() => [...bulletin.interests]);
  const [event, setEvent] = useState(bulletin.event);
  return (
    <div>
      <div className="space-y-1.5">
        {interests.map((i, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              className={inputClass}
              value={i}
              placeholder="An interest"
              onChange={(e) => setInterests(interests.map((v, j) => (j === idx ? e.target.value : v)))}
            />
            <MiniChip
              label="Remove"
              onClick={() => setInterests(interests.filter((_, j) => j !== idx))}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setInterests([...interests, ""])}
          className="flex items-center gap-2 font-display text-xs font-bold text-panel-foreground"
        >
          <IconChip className="size-6">
            <Plus className="size-3" aria-hidden />
          </IconChip>
          Add interest
        </button>
        <div className="pt-1">
          <p className="mb-1 font-display text-xs font-bold uppercase tracking-wider text-panel-muted">
            Event
          </p>
          <input
            className={`${inputClass} w-full`}
            value={event}
            placeholder="Rooftop hang — Fri 8pm"
            onChange={(e) => setEvent(e.target.value)}
          />
        </div>
      </div>
      <SaveBar onSave={() => onSave({ interests: interests.filter((i) => i.trim()), event })} />
    </div>
  );
};

/* ---------------- watching ---------------- */

const WatchingView = ({
  room,
  watching,
}: {
  room: PersonRoom;
  watching: { title: string; status?: string };
}) => (
  <div className="relative border-2 border-ink bg-panel-foreground/5 p-3">
    <span
      aria-hidden
      className="absolute left-3 top-3 h-6 w-2/3 opacity-40"
      style={{ backgroundColor: hex(MOODS[room.mood].glow) }}
    />
    <div className="relative flex items-center gap-2">
      <IconChip>
        <Tv className="size-3.5" aria-hidden />
      </IconChip>
      <span className="font-display text-base font-bold text-panel-foreground">
        {watching.title || "Nothing on"}
      </span>
    </div>
    {watching.status ? (
      <p className="mt-1.5 font-body text-xs text-panel-muted">{watching.status}</p>
    ) : null}
  </div>
);

const WatchingEdit = ({
  watching,
  onSave,
}: {
  watching: { title: string; status?: string };
  onSave: (w: { title: string; status?: string }) => void;
}) => {
  const [title, setTitle] = useState(watching.title);
  const [status, setStatus] = useState(watching.status ?? "");
  return (
    <div>
      <div className="space-y-1.5">
        <input
          className={`${inputClass} w-full`}
          value={title}
          placeholder="What are you watching?"
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={`${inputClass} w-full`}
          value={status}
          placeholder="Season 2, Episode 4"
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      <SaveBar onSave={() => onSave({ title, status })} />
    </div>
  );
};

/* ---------------- corkboard (unchanged behaviour) ---------------- */

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
    <Shell
      accent="#c9a227"
      title="Question of the day"
      subtitle={`+${DAILY_COIN_REWARD} coins`}
      interactive
    >
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

/* ---------------- root ---------------- */

export const DormPopup = ({ payload }: { payload: PopupPayload | null }) => {
  const { mySongs, myBulletin, myNowWatching } = usePlayerState();
  const [editing, setEditing] = useState(false);
  const kind = payload?.kind ?? null;

  // leaving a prop (or switching props) always drops back to the display view
  useEffect(() => {
    setEditing(false);
  }, [kind]);

  if (!payload) return null;

  if (payload.kind === "songs") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const songs = mine ? mySongs : room.songs;
    return (
      <Shell
        accent={room.accentColor}
        title={`${room.name} — Top 5`}
        subtitle={MOODS[room.mood].label}
        interactive={mine}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <SongsEdit
            songs={songs}
            onSave={(s) => {
              playerActions.setSongs(s);
              setEditing(false);
            }}
          />
        ) : (
          <SongsView room={room} songs={songs} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "bulletin") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const bulletin = mine ? myBulletin : room.bulletin;
    return (
      <Shell
        accent={room.accentColor}
        title={`${room.name} — Bulletin board`}
        interactive={mine}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <BulletinEdit
            bulletin={bulletin}
            onSave={(b) => {
              playerActions.setBulletin(b);
              setEditing(false);
            }}
          />
        ) : (
          <BulletinView accent={room.accentColor} bulletin={bulletin} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "watching") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const watching = mine ? myNowWatching : (room.nowWatching ?? { title: "Nothing on" });
    return (
      <Shell
        accent={room.accentColor}
        title={`${room.name} — Now watching`}
        interactive={mine}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <WatchingEdit
            watching={watching}
            onSave={(w) => {
              playerActions.setNowWatching(w);
              setEditing(false);
            }}
          />
        ) : (
          <WatchingView room={room} watching={watching} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "companion") {
    const room = payload.room;
    const c = room.companion;
    return (
      <Shell accent={room.accentColor} title={c.name} subtitle={c.breed}>
        <div className="flex items-center gap-3 border-2 border-ink bg-panel-foreground/5 p-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center border-2 border-ink font-display text-lg font-bold text-ink"
            style={{ backgroundColor: hex(MOODS[room.mood].posterAccent) }}
          >
            {c.type === "pet" ? "🐾" : "🌱"}
          </span>
          <span>
            <span className="block font-display text-sm font-bold text-panel-foreground">
              {c.name}
            </span>
            <span className="block font-body text-xs text-panel-muted">{c.blurb}</span>
          </span>
        </div>
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
