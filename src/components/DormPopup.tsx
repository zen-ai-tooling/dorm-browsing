import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Pencil, Shuffle, X } from "lucide-react";
import {
  BULLETIN_MAX_PINS,
  COMMUNITY_CORKBOARD,
  COVER_MOTIFS,
  MOODS,
  ROOMS,
  SONG_NOTE_MAX,
  UP_NEXT_MAX,
  WATCH_VIBES,
  type Bulletin,
  type MoodKey,
  type NowWatching,
  type PersonRoom,
  type Pin,
  type PinKind,
  type PopupPayload,
  type Song,
  type WatchVibe,
} from "@/data/dorm";
import {
  countSongCommon,
  pinMatchKey,
  pinMatches,
  showMatches,
  songMatches,
} from "@/data/interests";
import {
  CUSTOM_STICKER_ID,
  STICKER_GROUPS,
  STICKERS,
  stickerFor,
  type StickerDef,
  type StickerGroup,
} from "@/data/stickers";
import {
  DAILY_COIN_REWARD,
  DAILY_RESIDENTS,
  floorSplit,
  promptForToday,
  residentPick,
  todayKey,
} from "@/data/prompts";
import { ITEM_CATALOG } from "@/data/items";
import type { PackageReward } from "@/data/mail";
import { coverFor, discFor, hashString } from "@/lib/coverArt";
import { roomNameFor } from "@/data/avatar";
import { blockAt, MAX_HEARTS, pickLine, RESIDENTS, roomActiveAt, type ResidentId } from "@/data/residents";
import { avatarDataUrl } from "@/lib/avatarCanvas";
import { talkContextFor } from "@/lib/residentTalk";
import { currentHour, useTimeVersion } from "@/lib/timeStore";
import { getPlayerState, playerActions, usePlayerState } from "@/lib/playerStore";
import { GamePanel, IconChip } from "./GamePanel";
import { PixelIcon } from "./PixelIcon";
import { sfx } from "@/game/sounds";

const MY_ROOM_ID = "room-1";
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const pixelated: CSSProperties = { imageRendering: "pixelated" };

type Variant = "crate" | "crt" | "cork";

const VARIANT_STRIP: Record<Variant, string> = {
  crate: "crate-strip",
  crt: "crt-bezel",
  cork: "pixel-corkboard border-b-[3px] border-ink",
};

/**
 * Phones open popups as a bottom sheet (drag handle, swipe down to close) instead of the
 * floating card; the content inside is identical.
 */
export const PopupSheetContext = createContext<{ sheet: boolean; onClose?: () => void }>({ sheet: false });

const SheetFrame = ({ onClose, children }: { onClose?: (() => void) | undefined; children: ReactNode }) => {
  const start = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 max-h-[72%] overflow-y-auto pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 duration-200"
      style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
      role="dialog"
      aria-modal="false"
    >
      <div
        className="flex touch-none justify-center bg-transparent pb-1 pt-2"
        onPointerDown={(e) => {
          start.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
        }}
        onPointerUp={() => {
          const d = drag;
          start.current = null;
          setDrag(0);
          if (d > 50) onClose?.();
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
      >
        <button type="button" aria-label="Close" onClick={() => onClose?.()} className="px-6 py-1">
          <span aria-hidden className="block h-1.5 w-12 border-2 border-ink bg-panel" />
        </button>
      </div>
      {children}
    </div>
  );
};

const Shell = (props: Parameters<typeof ShellCard>[0]) => {
  const { sheet, onClose } = useContext(PopupSheetContext);
  if (!sheet) return <ShellCard {...props} />;
  return (
    <SheetFrame onClose={onClose}>
      <ShellCard {...props} sheet />
    </SheetFrame>
  );
};

const ShellCard = ({
  accent,
  title,
  subtitle,
  interactive,
  onEdit,
  editing,
  variant,
  badge,
  children,
  sheet = false,
}: {
  sheet?: boolean;
  accent: string;
  title: string;
  subtitle?: string;
  interactive?: boolean;
  onEdit?: () => void;
  editing?: boolean;
  variant?: Variant;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <div
    className={
      sheet
        ? "pointer-events-auto relative w-full"
        : `absolute bottom-5 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            interactive ? "pointer-events-auto" : "pointer-events-none"
          }`
    }
    role="status"
    aria-live="polite"
  >
    <GamePanel accent={accent} className="p-4">
      {variant ? (
        <div aria-hidden className={`-ml-6 -mr-4 -mt-4 mb-3 h-4 ${VARIANT_STRIP[variant]}`} />
      ) : null}
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
      {badge ? <div className="mt-1">{badge}</div> : null}
      <div
        className={`mt-2 font-body text-sm text-panel-muted ${
          interactive ? "max-h-[min(62vh,480px)] overflow-y-auto pr-1" : ""
        }`}
      >
        {children}
      </div>
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

const smallBtn =
  "rounded-[3px] border-2 border-ink bg-panel px-2 py-1 font-display text-[11px] font-bold text-panel-foreground transition hover:bg-ink hover:text-panel disabled:opacity-40 disabled:hover:bg-panel disabled:hover:text-panel-foreground";

const MiniChip = ({ label, onClick }: { label: "Move up" | "Move down"; onClick: () => void }) => (
  <button type="button" aria-label={label} onClick={onClick}>
    <IconChip className="size-6">
      {label === "Move up" ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : (
        <ArrowDown className="size-3" aria-hidden />
      )}
    </IconChip>
  </button>
);

/* ---------------- shared bits ---------------- */

const YouToo = ({ accent }: { accent: string }) => (
  <span
    className="inline-block shrink-0 border-2 border-ink px-1 font-display text-[9px] font-bold uppercase leading-tight tracking-wider text-ink"
    style={{ backgroundColor: accent }}
  >
    you too
  </span>
);

const CommonChip = ({ count, accent }: { count: number; accent: string }) =>
  count > 0 ? (
    <span
      className="inline-block border-2 border-ink px-1.5 py-px font-display text-[10px] font-bold uppercase tracking-wider text-ink"
      style={{ backgroundColor: accent }}
    >
      {count} {count === 1 ? "thing" : "things"} in common
    </span>
  ) : null;

const matchOutline = (on: boolean, accent: string): CSSProperties | undefined =>
  on ? { outline: `1px solid ${accent}`, outlineOffset: 2 } : undefined;

const Cover = ({
  song,
  mood,
  scale,
  className = "",
}: {
  song: Song;
  mood: MoodKey;
  scale: 2 | 3 | 6;
  className?: string;
}) => {
  const px = 16 * scale;
  const blank = !song.title.trim() && !song.artist.trim();
  const src = blank ? "" : coverFor(song.title, song.artist, mood);
  return src ? (
    <img
      src={src}
      alt=""
      width={px}
      height={px}
      className={`shrink-0 border-2 border-ink ${className}`}
      style={{ ...pixelated, width: px, height: px }}
    />
  ) : (
    <span
      className={`shrink-0 border-2 border-dashed border-ink/40 ${className}`}
      style={{ width: px, height: px }}
    />
  );
};

/* ---------------- songs → record sleeve ---------------- */

const Marquee = ({ text }: { text: string }) => {
  if (text.length <= 15)
    return (
      <span className="block truncate font-display text-lg font-bold leading-tight text-panel-foreground">
        {text || "—"}
      </span>
    );
  return (
    <span className="block overflow-hidden font-display text-lg font-bold leading-tight text-panel-foreground">
      <span
        className="inline-flex whitespace-nowrap"
        style={{ animation: `pixel-marquee ${Math.max(6, text.length * 0.45)}s steps(${text.length * 2}) infinite` }}
      >
        <span className="pr-8">{text}</span>
        <span className="pr-8" aria-hidden>
          {text}
        </span>
      </span>
    </span>
  );
};

const SongsView = ({
  room,
  songs,
  matches,
}: {
  room: PersonRoom;
  songs: Song[];
  matches?: boolean[];
}) => {
  const [hero, ...rest] = songs;
  const accent = room.accentColor;
  if (!hero) return <p className="italic">no songs yet</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" style={matchOutline(!!matches?.[0], accent)}>
        <div className="relative h-24 w-[152px] shrink-0">
          <img
            src={discFor(hex(MOODS[room.mood].glow))}
            alt=""
            width={88}
            height={88}
            className="absolute left-[60px] top-1 size-[88px]"
            style={{
              ...pixelated,
              animation: roomActiveAt(room, currentHour()) ? "vinyl-spin 2.4s steps(8) infinite" : undefined,
            }}
          />
          <Cover song={hero} mood={room.mood} scale={6} className="absolute left-0 top-0" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
            {roomActiveAt(room, currentHour()) ? "now playing" : "on repeat"}
          </span>
          <Marquee text={hero.title} />
          <span className="block truncate font-body text-xs text-panel-muted">{hero.artist}</span>
          {hero.note ? (
            <span className="block truncate font-body text-xs italic text-panel-foreground/80">
              “{hero.note}”
            </span>
          ) : null}
          {matches?.[0] ? (
            <span className="mt-1 block">
              <YouToo accent={accent} />
            </span>
          ) : null}
        </div>
      </div>
      {rest.length ? (
        <ol className="space-y-1.5 border-t-2 border-dashed border-ink/30 pt-2" start={2}>
          {rest.map((s, i) => (
            <li
              key={`${s.title}-${i}`}
              className="flex items-center gap-2"
              style={matchOutline(!!matches?.[i + 1], accent)}
            >
              <span className="w-3 font-body text-xs font-bold tabular-nums text-panel-muted">{i + 2}</span>
              <Cover song={s} mood={room.mood} scale={3} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-bold text-panel-foreground">
                  {s.title || "—"}
                </span>
                <span className="block truncate font-body text-xs text-panel-muted">
                  {s.artist}
                  {s.note ? <span className="italic"> · {s.note}</span> : null}
                </span>
              </span>
              {matches?.[i + 1] ? <YouToo accent={accent} /> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};

const SongsEdit = ({
  songs,
  mood,
  onSave,
}: {
  songs: Song[];
  mood: MoodKey;
  onSave: (s: Song[]) => void;
}) => {
  const [draft, setDraft] = useState<Song[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({ title: "", artist: "", note: "", ...songs[i] })),
  );
  const swap = (a: number, b: number) => {
    if (b < 0 || b >= draft.length) return;
    const next = [...draft];
    [next[a], next[b]] = [next[b]!, next[a]!];
    setDraft(next);
  };
  const patch = (i: number, p: Partial<Song>) => setDraft(draft.map((d, j) => (j === i ? { ...d, ...p } : d)));
  return (
    <div>
      <div className="space-y-2">
        {draft.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-3 font-body text-xs font-bold tabular-nums text-panel-muted">{i + 1}</span>
            {/* live cover — re-rolls as you type */}
            <Cover song={s} mood={mood} scale={3} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex gap-1">
                <input
                  className={inputClass}
                  value={s.title}
                  placeholder="Title"
                  onChange={(e) => patch(i, { title: e.target.value })}
                />
                <input
                  className={inputClass}
                  value={s.artist}
                  placeholder="Artist"
                  onChange={(e) => patch(i, { artist: e.target.value })}
                />
              </div>
              <input
                className={`${inputClass} w-full italic`}
                value={s.note ?? ""}
                maxLength={SONG_NOTE_MAX}
                placeholder="a note — “2am drive song”"
                onChange={(e) => patch(i, { note: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <MiniChip label="Move up" onClick={() => swap(i, i - 1)} />
              <MiniChip label="Move down" onClick={() => swap(i, i + 1)} />
            </div>
          </div>
        ))}
      </div>
      <SaveBar
        onSave={() =>
          onSave(
            draft.map((d) => {
              const note = (d.note ?? "").trim();
              return { title: d.title, artist: d.artist, ...(note ? { note } : {}) };
            }),
          )
        }
      />
    </div>
  );
};

/* ---------------- watching → CRT ---------------- */

const VIBE_COLOR: Record<WatchVibe, string> = {
  obsessed: "#e98d70",
  "comfort rewatch": "#b98ee0",
  "hate-watching": "#c4583f",
  "background noise": "#8d8090",
  "just started": "#63c9b6",
};

const Segments = ({
  value,
  onPick,
  color,
}: {
  value: number;
  onPick?: (n: number) => void;
  color: string;
}) => {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * 10);
  return (
    <div className="flex gap-[3px]" role={onPick ? "group" : undefined} aria-label={`${filled * 10}% watched`}>
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < filled;
        const cls = `h-2.5 flex-1 border-2 border-ink`;
        const style = { backgroundColor: on ? color : "transparent" };
        return onPick ? (
          <button
            key={i}
            type="button"
            aria-label={`${(i + 1) * 10}%`}
            className={`${cls} h-4`}
            style={style}
            // tapping the last filled block clears it
            onClick={() => onPick(filled === i + 1 ? i / 10 : (i + 1) / 10)}
          />
        ) : (
          <span key={i} className={cls} style={style} />
        );
      })}
    </div>
  );
};

const WatchingView = ({
  room,
  watching,
  match,
}: {
  room: PersonRoom;
  watching: NowWatching;
  match?: { title: boolean; upNext: boolean[] };
}) => {
  const channel = (room.roomNumber ?? "03").slice(-2);
  const accent = room.accentColor;
  return (
    <div className="space-y-2">
      <div className="crt-bezel rounded-[6px] p-2.5">
        <div
          className="crt-screen relative min-h-[132px] overflow-hidden border-2 border-ink px-3 py-2 font-display"
          style={matchOutline(!!match?.title, accent)}
        >
          <div className="flex items-start justify-between gap-2 text-[11px] font-bold tracking-wider">
            <span>CH {channel}</span>
            {watching.vibe ? (
              <span
                className="border-2 border-ink px-1 text-[9px] uppercase text-ink"
                style={{ backgroundColor: VIBE_COLOR[watching.vibe] }}
              >
                {watching.vibe}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-center text-xl font-bold leading-tight">{watching.title || "Nothing on"}</p>
          {match?.title ? (
            <p className="mt-1 text-center">
              <YouToo accent={accent} />
            </p>
          ) : null}
          {typeof watching.progress === "number" ? (
            <div className="mx-auto mt-2 w-4/5">
              <Segments value={watching.progress} color="var(--crt-text)" />
            </div>
          ) : null}
          {watching.status ? (
            <p className="mt-2 truncate text-[11px] uppercase tracking-wider">▶ {watching.status}</p>
          ) : null}
          {/* 2-frame static on open */}
          <span aria-hidden className="crt-static pointer-events-none absolute inset-0" />
        </div>
        <div aria-hidden className="mt-1.5 flex items-center justify-end gap-1.5">
          <span className="size-2 border border-ink" style={{ backgroundColor: roomActiveAt(room, currentHour()) ? "#7cc46a" : "#8d8090" }} />
          <span className="size-2.5 border-2 border-ink bg-panel-muted" />
          <span className="size-2.5 border-2 border-ink bg-panel-muted" />
        </div>
      </div>
      {watching.upNext?.length ? (
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">up next</p>
          <ol className="mt-0.5 space-y-0.5">
            {watching.upNext.map((t, i) => (
              <li
                key={`${t}-${i}`}
                className="flex items-center gap-2 font-body text-xs text-panel-foreground"
                style={matchOutline(!!match?.upNext[i], accent)}
              >
                <span className="font-display font-bold text-panel-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{t}</span>
                {match?.upNext[i] ? <YouToo accent={accent} /> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
};

const WatchingEdit = ({
  watching,
  accent,
  onSave,
}: {
  watching: NowWatching;
  accent: string;
  onSave: (w: NowWatching) => void;
}) => {
  const [title, setTitle] = useState(watching.title);
  const [status, setStatus] = useState(watching.status ?? "");
  const [progress, setProgress] = useState(watching.progress ?? 0);
  const [vibe, setVibe] = useState<WatchVibe | undefined>(watching.vibe);
  const [upNext, setUpNext] = useState<string[]>(() =>
    Array.from({ length: UP_NEXT_MAX }, (_, i) => watching.upNext?.[i] ?? ""),
  );
  const label = "mb-1 font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted";
  return (
    <div className="space-y-2.5">
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
      <div>
        <p className={label}>how far in</p>
        <Segments value={progress} onPick={setProgress} color={accent} />
      </div>
      <div>
        <p className={label}>vibe</p>
        <div className="flex flex-wrap gap-1.5">
          {WATCH_VIBES.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vibe === v}
              onClick={() => setVibe(vibe === v ? undefined : v)}
              className="border-2 border-ink px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-ink"
              style={{ backgroundColor: vibe === v ? VIBE_COLOR[v] : "transparent" }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={label}>up next</p>
        <div className="space-y-1">
          {upNext.map((t, i) => (
            <input
              key={i}
              className={`${inputClass} w-full`}
              value={t}
              placeholder={`${i + 1}.`}
              onChange={(e) => setUpNext(upNext.map((u, j) => (j === i ? e.target.value : u)))}
            />
          ))}
        </div>
      </div>
      <SaveBar
        onSave={() =>
          onSave({
            title,
            status,
            progress,
            ...(vibe ? { vibe } : {}),
            upNext: upNext.map((u) => u.trim()).filter(Boolean),
          })
        }
      />
    </div>
  );
};

/* ---------------- bulletin → corkboard ---------------- */

const TICKET_CLIP =
  "polygon(0 0,100% 0,100% 38%,calc(100% - 5px) 38%,calc(100% - 5px) 62%,100% 62%,100% 100%,0 100%,0 62%,5px 62%,5px 38%,0 38%)";

const PinCard = ({ pin, room }: { pin: Pin; room: PersonRoom }) => {
  const mood = MOODS[room.mood];
  switch (pin.kind) {
    case "interest": {
      const def = stickerFor(pin.stickerId);
      const label = pin.stickerId === CUSTOM_STICKER_ID ? pin.text || "custom" : pin.text || def.label;
      return (
        <div className="flex flex-col items-center gap-1 border-2 border-ink bg-panel px-1.5 py-1.5 shadow-[2px_2px_0_0_rgba(36,28,38,0.35)]">
          <PixelIcon def={def} size={24} />
          <span className="line-clamp-2 text-center font-body text-[11px] font-semibold leading-tight text-panel-foreground">
            {label}
          </span>
        </div>
      );
    }
    case "ticket":
      return (
        <div className="pixel-outline">
          <div
            className="relative px-3 py-1.5 text-ink"
            style={{ clipPath: TICKET_CLIP, backgroundColor: hex(mood.glow) }}
          >
            <span aria-hidden className="absolute bottom-1 right-3 top-1 border-l-2 border-dotted border-ink/60" />
            <span className="block pr-3 font-display text-[11px] font-bold leading-tight">{pin.text}</span>
            {pin.when ? <span className="block font-body text-[11px] font-extrabold">{pin.when}</span> : null}
          </div>
        </div>
      );
    case "polaroid": {
      const src = coverFor(pin.caption, "polaroid", room.mood, pin.motif);
      return (
        <div className="border-2 border-ink bg-[var(--polaroid)] p-1 shadow-[2px_2px_0_0_rgba(36,28,38,0.35)]">
          {src ? (
            <img src={src} alt="" className="mx-auto block size-16 border-2 border-ink" style={pixelated} />
          ) : (
            <span className="mx-auto block size-16 border-2 border-ink" />
          )}
          <span className="mt-0.5 line-clamp-2 block text-center font-body text-[10px] italic leading-tight text-ink">
            {pin.caption}
          </span>
        </div>
      );
    }
    case "pennant":
      return (
        <div className="pixel-outline">
          <div
            className="flex h-12 items-center pl-2 pr-8 text-ink"
            style={{ clipPath: "polygon(0 0,100% 50%,0 100%)", backgroundColor: room.accentColor }}
          >
            <span className="line-clamp-2 font-display text-[10px] font-bold uppercase leading-tight">
              {pin.text}
            </span>
          </div>
        </div>
      );
    case "book":
      return (
        <div className="flex border-2 border-ink shadow-[2px_2px_0_0_rgba(36,28,38,0.35)]">
          <span aria-hidden className="w-2 shrink-0 border-r-2 border-ink" style={{ backgroundColor: hex(mood.posterAccent) }} />
          <div className="min-w-0 flex-1 px-1.5 py-1 text-ink" style={{ backgroundColor: hex(mood.wall) }}>
            <span className="line-clamp-2 font-display text-[10px] font-bold leading-tight">{pin.title}</span>
            {pin.author ? (
              <span className="mt-0.5 block truncate font-body text-[9px] leading-tight">{pin.author}</span>
            ) : null}
          </div>
        </div>
      );
  }
};

const pinSeed = (p: Pin, i: number) => hashString(`${i}:${JSON.stringify(p)}`);

const Board = ({
  room,
  pins,
  matches,
  selected,
  onSelect,
  onRemove,
}: {
  room: PersonRoom;
  pins: Pin[];
  matches?: boolean[];
  selected?: number | null;
  onSelect?: (i: number | null) => void;
  onRemove?: (i: number) => void;
}) => (
  <div className="pixel-corkboard border-2 border-ink p-3">
    {pins.length === 0 ? (
      <p className="py-4 text-center font-body text-xs italic text-ink">nothing pinned yet</p>
    ) : null}
    <div className="grid grid-cols-3 items-start gap-x-2.5 gap-y-4">
      {pins.map((p, i) => {
        const seed = pinSeed(p, i);
        const rot = (i % 2 === 0 ? -1 : 1) * (1 + (seed % 3) * 0.75);
        const dx = ((seed >> 3) % 5) - 2;
        const dy = ((seed >> 6) % 5) - 2;
        const matched = !!matches?.[i];
        const isSel = selected === i;
        const inner = (
          <>
            <span
              aria-hidden
              className="absolute -top-1.5 left-1/2 z-10 size-2.5 -translate-x-1/2 border-2 border-ink"
              style={{ backgroundColor: room.accentColor }}
            />
            <PinCard pin={p} room={room} />
            {matched ? (
              <span className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2">
                <YouToo accent={room.accentColor} />
              </span>
            ) : null}
          </>
        );
        const style: CSSProperties = {
          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
          ...matchOutline(matched || isSel, matched ? room.accentColor : "var(--color-ink)"),
        };
        return onSelect ? (
          <div key={`${i}-${seed}`} className="relative" style={style}>
            <button
              type="button"
              className="relative block w-full text-left"
              aria-label="Select pin"
              onClick={() => onSelect(isSel ? null : i)}
            >
              {inner}
            </button>
            {isSel && onRemove ? (
              <button
                type="button"
                aria-label="Remove pin"
                onClick={() => onRemove(i)}
                className="absolute -right-2 -top-2 z-20"
              >
                <IconChip className="size-6 bg-panel">
                  <X className="size-3" aria-hidden />
                </IconChip>
              </button>
            ) : null}
          </div>
        ) : (
          <div key={`${i}-${seed}`} className="relative" style={style}>
            {inner}
          </div>
        );
      })}
    </div>
  </div>
);

const PIN_KINDS: { kind: PinKind; label: string }[] = [
  { kind: "interest", label: "Interest" },
  { kind: "ticket", label: "Ticket" },
  { kind: "polaroid", label: "Polaroid" },
  { kind: "pennant", label: "Pennant" },
  { kind: "book", label: "Book" },
];

const StickerSheet = ({ onPick }: { onPick: (pin: Pin) => void }) => {
  const [group, setGroup] = useState<StickerGroup | "Custom">("Music");
  const [custom, setCustom] = useState("");
  const list = useMemo(() => STICKERS.filter((st) => st.group === group), [group]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[...STICKER_GROUPS, "Custom" as const].map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
            className={`border-2 border-ink px-1.5 py-0.5 font-display text-[10px] font-bold uppercase ${
              group === g ? "bg-ink text-panel" : "bg-panel text-panel-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      {group === "Custom" ? (
        <div className="flex gap-1.5">
          <input
            className={inputClass}
            value={custom}
            maxLength={32}
            placeholder="learning to juggle"
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            type="button"
            className={smallBtn}
            disabled={!custom.trim()}
            onClick={() => {
              onPick({ kind: "interest", stickerId: CUSTOM_STICKER_ID, text: custom.trim() });
              setCustom("");
            }}
          >
            Pin it
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {list.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onPick({ kind: "interest", stickerId: st.id })}
              className="flex flex-col items-center gap-0.5 border-2 border-ink bg-panel p-1 transition hover:bg-panel-foreground/10"
            >
              <PixelIcon def={st} size={24} />
              <span className="line-clamp-2 text-center font-body text-[10px] leading-tight text-panel-foreground">
                {st.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const randomMotif = (not?: string) => {
  const options = COVER_MOTIFS.filter((m) => m !== not);
  return options[Math.floor(Math.random() * options.length)]!;
};

const PinForm = ({
  kind,
  mood,
  onPick,
}: {
  kind: Exclude<PinKind, "interest">;
  mood: MoodKey;
  onPick: (pin: Pin) => void;
}) => {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [motif, setMotif] = useState(() => randomMotif());
  const fields: Record<typeof kind, [string, string | null]> = {
    ticket: ["Rooftop hang", "Fri 8pm"],
    pennant: ["Floor 3", null],
    book: ["Title", "Author"],
    polaroid: ["caption", null],
  };
  const [pa, pb] = fields[kind];
  const pin = (): Pin => {
    const A = a.trim();
    const B = b.trim();
    if (kind === "ticket") return { kind, text: A, ...(B ? { when: B } : {}) };
    if (kind === "pennant") return { kind, text: A };
    if (kind === "book") return { kind, title: A, ...(B ? { author: B } : {}) };
    return { kind: "polaroid", caption: A, motif };
  };
  const preview = kind === "polaroid" ? coverFor(a.trim(), "polaroid", mood, motif) : "";
  return (
    <div className="flex items-center gap-1.5">
      {kind === "polaroid" ? (
        <>
          {preview ? (
            <img src={preview} alt="" width={40} height={40} className="size-10 border-2 border-ink" style={pixelated} />
          ) : null}
          <button
            type="button"
            aria-label="Shuffle the photo"
            onClick={() => {
              sfx.uiClick();
              setMotif(randomMotif(motif));
            }}
          >
            <IconChip className="size-7">
              <Shuffle className="size-3.5" aria-hidden />
            </IconChip>
          </button>
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 gap-1">
        <input
          className={inputClass}
          value={a}
          maxLength={40}
          placeholder={pa}
          onChange={(e) => setA(e.target.value)}
        />
        {pb ? (
          <input
            className={inputClass}
            value={b}
            maxLength={32}
            placeholder={pb}
            onChange={(e) => setB(e.target.value)}
          />
        ) : null}
      </div>
      <button
        type="button"
        className={smallBtn}
        disabled={!a.trim()}
        onClick={() => {
          onPick(pin());
          setA("");
          setB("");
          setMotif(randomMotif(motif));
        }}
      >
        Pin it
      </button>
    </div>
  );
};

const BulletinEdit = ({
  room,
  bulletin,
  onSave,
}: {
  room: PersonRoom;
  bulletin: Bulletin;
  onSave: (b: Bulletin) => void;
}) => {
  const [pins, setPins] = useState<Pin[]>(() => bulletin.pins.map((p) => ({ ...p })));
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState<PinKind | null>(null);
  const full = pins.length >= BULLETIN_MAX_PINS;
  const add = (p: Pin) => {
    if (full) return;
    sfx.placeItem();
    setPins([...pins, p]);
    if (pins.length + 1 >= BULLETIN_MAX_PINS) setAdding(null);
  };
  return (
    <div className="space-y-2.5">
      <Board
        room={room}
        pins={pins}
        selected={selected}
        onSelect={setSelected}
        onRemove={(i) => {
          sfx.uiClick();
          setPins(pins.filter((_, j) => j !== i));
          setSelected(null);
        }}
      />
      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">Add a pin</p>
          <span className="font-body text-[10px] tabular-nums text-panel-muted">
            {pins.length}/{BULLETIN_MAX_PINS}
          </span>
        </div>
        {full ? (
          <p className="mt-1 font-body text-xs italic text-panel-foreground">
            Board's full — tap a pin to take one down.
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PIN_KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={adding === kind}
                onClick={() => {
                  sfx.uiClick();
                  setAdding(adding === kind ? null : kind);
                }}
                className={`${smallBtn} ${adding === kind ? "!bg-ink !text-panel" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {!full && adding ? (
        <div className="border-2 border-dashed border-ink/40 p-2">
          {adding === "interest" ? (
            <StickerSheet onPick={add} />
          ) : (
            <PinForm key={adding} kind={adding} mood={room.mood} onPick={add} />
          )}
        </div>
      ) : null}
      <SaveBar onSave={() => onSave({ pins })} />
    </div>
  );
};

/* ---------------- corkboard: question of the day + results ---------------- */

const RESIDENT_ACCENT: Record<string, string> = Object.fromEntries(ROOMS.map((r) => [r.id, r.accentColor]));

/** tiny pixel head in the resident's accent (hair) */
const Head = ({ accent, size = 18 }: { accent: string; size?: number }) => (
  <PixelIcon
    size={size}
    def={{
      icon: ["..XXXX..", ".XaaaaX.", "XaaaaaaX", "XooooooX", "XoXooXoX", "XooooooX", ".XooooX.", "..XXXX.."],
      color: "#f1c9a5",
      color2: accent,
    }}
  />
);

const AgreeChip = ({ name, accent }: { name: string; accent: string }) => (
  <span
    className="inline-block border-2 border-ink px-1 font-display text-[9px] font-bold uppercase leading-tight tracking-wider text-ink"
    style={{ backgroundColor: accent }}
  >
    You and {name} agree
  </span>
);

const DailyResults = ({ justAnswered }: { justAnswered: boolean }) => {
  const { dailyAnswers } = usePlayerState();
  const prompt = promptForToday();
  const entry = dailyAnswers[todayKey()];
  const mine = entry?.promptId === prompt.id ? entry.answer : null;
  const split = floorSplit(prompt);
  const picks = DAILY_RESIDENTS.map((r) => ({ ...r, pick: residentPick(r.id, prompt), accent: RESIDENT_ACCENT[r.id] ?? "#8d8090" }));
  return (
    <Shell accent="#c9a227" title="Question of the day" subtitle={justAnswered ? `+${DAILY_COIN_REWARD} coins` : "answered ✓"}>
      <p className="font-body font-semibold text-panel-foreground">{prompt.question}</p>
      <p className="mt-2 font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">Floor 3 residents</p>
      <ul className="mt-1 space-y-1">
        {prompt.options.map((opt, i) => {
          const isMine = opt === mine;
          const who = picks.filter((p) => p.pick === opt);
          return (
            <li
              key={opt}
              className={`border-2 px-1.5 py-1 ${isMine ? "border-ink bg-primary/25" : "border-transparent"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate font-body text-xs font-bold text-panel-foreground">
                  {opt}
                  {isMine ? <span className="ml-1 font-display text-[9px] uppercase text-panel-muted">you</span> : null}
                </span>
                {who.map((p) => (
                  <span key={p.id} title={`${p.name} picked this`}>
                    <Head accent={p.accent} size={15} />
                  </span>
                ))}
                <span className="w-8 shrink-0 text-right font-display text-[11px] font-bold tabular-nums text-panel-foreground">
                  {split[i]}%
                </span>
              </div>
              <div className="mt-0.5 h-2 border-2 border-ink bg-panel">
                <div className="h-full bg-ink/70" style={{ width: `${split[i]}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {picks.map((p) => (
          <span key={p.id} className="flex items-center gap-1 font-body text-[11px] text-panel-foreground">
            <Head accent={p.accent} size={15} />
            <span className="font-bold">{p.name}:</span> {p.pick}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-display text-xs font-bold text-panel-foreground">
          {mine ? "Pinned to your door ✓" : "You answered today ✓"}
        </span>
        {picks
          .filter((p) => mine && p.pick === mine)
          .map((p) => (
            <AgreeChip key={p.id} name={p.name} accent={p.accent} />
          ))}
      </div>
    </Shell>
  );
};

const CorkboardPopup = () => {
  const { lastDailyAnswerDate } = usePlayerState();
  const [justAnswered, setJustAnswered] = useState(false);
  const answeredToday = lastDailyAnswerDate === todayKey();
  const prompt = promptForToday();

  if (answeredToday) return <DailyResults justAnswered={justAnswered} />;

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
              setJustAnswered(true);
              playerActions.answerDaily(opt);
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

/* ---------------- daily mail package ---------------- */

const BOX_BODY = [
  ".Xoooooo++ooooX.",
  ".Xoooooo++o++oX.",
  ".Xoooooo++ooooX.",
  ".Xaaaaaa++aaaaX.",
  ".Xaaaaaa++aaaaX.",
  ".XXXXXXXXXXXXXX.",
  "................",
];
/** 3 stepped frames: closed → lid lifting → open with rays */
const BOX_FRAMES: string[][] = [
  ["................", "................", "................", "XXXXXXXXXXXXXXXX", "Xooooooo++oooooX", "XXXXXXXXXXXXXXXX", ".Xoooooo++ooooX.", ...BOX_BODY],
  ["................", "XXXXXXXXXXXXXXXX", "Xooooooo++oooooX", "XXXXXXXXXXXXXXXX", "..y....y....y...", ".XXXXXXXXXXXXXX.", ".Xoooooo++ooooX.", ...BOX_BODY],
  ["y......y......y.", "..y....y....y...", "....y..y..y.....", "................", "................", ".XXXXXXXXXXXXXX.", ".XaaaaaaaaaaaaX.", ...BOX_BODY],
];

const PackageBox = ({ frame, size = 72 }: { frame: number; size?: number }) => (
  <PixelIcon
    size={size}
    def={{
      icon: BOX_FRAMES[Math.min(frame, 2)]!,
      color: "#c99a5b",
      color2: "#a97a43",
      palette: { y: "#f2cf5c" },
    }}
  />
);

const CoinBurst = ({ count }: { count: number }) => (
  <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
    {Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      const r = count > 8 ? 70 : 44;
      return (
        <span
          key={i}
          className="absolute size-2.5 border-2 border-ink bg-[var(--tag-premium)]"
          style={{
            animation: `coin-fly 900ms steps(6) ${i * 25}ms forwards`,
            ["--dx" as string]: `${Math.round(Math.cos(a) * r)}px`,
            ["--dy" as string]: `${Math.round(Math.sin(a) * r * 0.7 - 10)}px`,
          }}
        />
      );
    })}
  </span>
);

/** stepped sparkle squares flung out as the reward pops */
const SparkleBurst = () => (
  <span aria-hidden className="pointer-events-none absolute left-1/2 top-0">
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      return (
        <span
          key={i}
          className="absolute size-1.5 bg-[var(--tag-premium)]"
          style={{
            animation: `sparkle-pop 500ms steps(4) ${i * 30}ms forwards`,
            ["--dx" as string]: `${Math.round(Math.cos(a) * 34)}px`,
            ["--dy" as string]: `${Math.round(Math.sin(a) * 26 - 8)}px`,
          }}
        />
      );
    })}
  </span>
);

/** little pixel coin pile for coin rewards */
const COIN_PILE = [
  "............",
  "............",
  "............",
  ".....XX.....",
  "....XooX....",
  "...XooooX...",
  "..XXoaaXXX..",
  ".XooXXXXooX.",
  ".XoaaXXoaXX.",
  "XooXoooXoXX.",
  "XoaaaaoaaaX.",
  "XXXXXXXXXXXX",
];

/** the thing that pops out of the box, before the text explains it */
const RewardVisual = ({
  reward,
  itemThumbnails,
}: {
  reward: PackageReward;
  itemThumbnails: Record<string, { src: string }>;
}) => {
  const { ownedItemIds } = usePlayerState();
  if (reward.kind === "coins" || reward.kind === "allFound")
    return <PixelIcon def={{ icon: COIN_PILE, color: "#f2cf5c", color2: "#c9962e" }} size={44} />;
  if (reward.kind === "jackpot")
    return (
      <span className="relative">
        <PixelIcon def={{ icon: COIN_PILE, color: "#f2cf5c", color2: "#c9962e" }} size={64} />
        <span className="absolute -right-3 -top-2">
          <PixelIcon def={{ icon: COIN_PILE, color: "#f2cf5c", color2: "#c9962e" }} size={28} />
        </span>
      </span>
    );
  if (reward.kind === "postcard")
    return (
      <div className="w-40 border-2 border-ink bg-[var(--polaroid)] p-2 [transform:rotate(-2deg)]">
        <p className="font-body text-[11px] italic leading-snug text-ink">“{reward.line}”</p>
        <p className="mt-1 text-right font-display text-[10px] font-bold text-ink">— {reward.from}</p>
      </div>
    );
  const item = ITEM_CATALOG[reward.itemId];
  const src = itemThumbnails[reward.itemId]?.src;
  return (
    <span className="relative inline-block">
      {src ? (
        <img src={src} alt={item?.name ?? ""} className="max-h-16 w-auto [image-rendering:pixelated]" />
      ) : null}
      {reward.kind === "item" ? (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-ink bg-[var(--tag-premium)] px-1 font-display text-[9px] font-bold uppercase tracking-wider text-ink">
          Mail find · {MAIL_ITEM_IDS.filter((id) => ownedItemIds.includes(id)).length}/{MAIL_ITEM_IDS.length}
        </span>
      ) : (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-ink bg-[var(--tag-nice)] px-1 font-display text-[9px] font-bold uppercase tracking-wider text-ink">
          From {reward.from} ♥
        </span>
      )}
    </span>
  );
};

const RewardView = ({
  reward,
  itemThumbnails,
}: {
  reward: PackageReward;
  itemThumbnails: Record<string, { src: string }>;
}) => {
  if (reward.kind === "postcard")
    return (
      <div className="border-2 border-ink bg-[var(--polaroid)] p-2 [transform:rotate(-1deg)]">
        <p className="font-body text-xs italic text-ink">“{reward.line}”</p>
        <p className="mt-1 flex items-center justify-between font-display text-[11px] font-bold text-ink">
          <span>— {reward.from}</span>
          <span>+{reward.coins} coins</span>
        </p>
      </div>
    );
  if (reward.kind === "gift") {
    const item = ITEM_CATALOG[reward.itemId];
    const src = itemThumbnails[reward.itemId]?.src;
    return (
      <div className="flex items-center gap-3">
        {src ? <img src={src} alt={item?.name ?? ""} className="max-h-12 w-auto [image-rendering:pixelated]" /> : null}
        <div>
          <span className="inline-block border-2 border-ink bg-[var(--tag-nice)] px-1 font-display text-[9px] font-bold uppercase tracking-wider text-ink">
            From {reward.from} ♥
          </span>
          <p className="font-display text-sm font-bold text-panel-foreground">{item?.name}</p>
          <p className="font-body text-[11px] text-panel-muted">
            {reward.coins > 0
              ? `You already had one — ${reward.from} slipped in +${reward.coins} coins instead.`
              : "A friendship gift. It's in your editor tray."}
          </p>
        </div>
      </div>
    );
  }
  if (reward.kind === "item") {
    const item = ITEM_CATALOG[reward.itemId];
    const src = itemThumbnails[reward.itemId]?.src;
    return (
      <div className="flex items-center gap-3">
        {src ? <img src={src} alt={item?.name ?? ""} className="max-h-12 w-auto [image-rendering:pixelated]" /> : null}
        <div>
          <span className="inline-block border-2 border-ink bg-[var(--tag-premium)] px-1 font-display text-[9px] font-bold uppercase tracking-wider text-ink">
            Mail find
          </span>
          <p className="font-display text-sm font-bold text-panel-foreground">{item?.name}</p>
          <p className="font-body text-[11px] text-panel-muted">Never sold in the shop — it's in your editor tray.</p>
        </div>
      </div>
    );
  }
  const text =
    reward.kind === "jackpot"
      ? "JACKPOT! Someone mailed you their whole coin jar."
      : reward.kind === "allFound"
        ? "You've found every mail exclusive — here's a bonus instead."
        : "A little envelope of spare change.";
  return (
    <p className={`font-display font-bold text-panel-foreground ${reward.kind === "jackpot" ? "text-base" : "text-sm"}`}>
      +{reward.coins} coins · <span className="font-body text-xs font-semibold">{text}</span>
    </p>
  );
};

const PackagePopup = ({ itemThumbnails }: { itemThumbnails: Record<string, { src: string }> }) => {
  const { lastPackageDate, lastPackage } = usePlayerState();
  const today = todayKey();
  const openedToday = lastPackageDate === today && lastPackage?.date === today;
  const [frame, setFrame] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (frame === null || frame >= 2) return;
    const t = window.setTimeout(() => setFrame(frame + 1), 170);
    return () => window.clearTimeout(t);
  }, [frame]);

  useEffect(() => {
    if (frame !== 2 || openedToday) return;
    const t = window.setTimeout(() => {
      playerActions.openPackage();
      setBurst(true);
    }, 170);
    return () => window.clearTimeout(t);
  }, [frame, openedToday]);

  const reward = openedToday ? lastPackage!.reward : null;

  return (
    <Shell accent="#c99a5b" title="Mail cubby" subtitle={reward ? "opened today" : "a package for you"} interactive>
      <div className="relative flex flex-col items-center gap-2">
        {reward ? (
          <>
            {burst ? <CoinBurst count={reward.kind === "jackpot" ? 14 : reward.coins > 0 ? 6 : 0} /> : null}
            <RewardView reward={reward} itemThumbnails={itemThumbnails} />
            <p className="font-body text-[11px] text-panel-muted">Next delivery tomorrow.</p>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label="Open the package"
              disabled={frame !== null}
              onClick={() => {
                sfx.uiClick();
                setFrame(0);
              }}
              className="rounded-[3px] p-1 transition-transform hover:-translate-y-0.5"
            >
              <PackageBox frame={frame ?? 0} />
            </button>
            <p className="font-body text-xs text-panel-foreground">Tap the box to open it.</p>
          </>
        )}
      </div>
    </Shell>
  );
};

/* ---------------- residents ---------------- */

const Hearts = ({ n }: { n: number }) => (
  <span className="flex items-center gap-[2px]" aria-label={`${n} of ${MAX_HEARTS} hearts`}>
    {Array.from({ length: MAX_HEARTS }, (_, i) => (
      <svg key={i} viewBox="0 0 7 6" width={10} height={9} shapeRendering="crispEdges" aria-hidden>
        <path
          d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"
          fill={i < n ? "#c8574a" : "transparent"}
          stroke="var(--color-ink)"
          strokeWidth={0.6}
        />
      </svg>
    ))}
  </span>
);

const ResidentPopup = ({ residentId }: { residentId: ResidentId }) => {
  useTimeVersion();
  const { friendship } = usePlayerState();
  const r = RESIDENTS[residentId];
  const room = ROOMS.find((x) => x.id === r.roomId)!;
  const hour = currentHour();
  const block = blockAt(residentId, hour);
  // one line per visit, chosen once (priority: about you → activity → filler; no repeats today)
  const [line] = useState(() => {
    const s = getPlayerState();
    const seen = s.linesSeen.date === todayKey() ? s.linesSeen.ids[residentId] : [];
    return pickLine(residentId, talkContextFor(residentId, s, hour), seen);
  });
  useEffect(() => {
    playerActions.talk(residentId, line.id);
  }, [residentId, line.id]);
  const portrait = avatarDataUrl(r.look, "down", 0, 4);
  return (
    <Shell accent={room.accentColor} title={r.name} subtitle={block.activity}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 border-[3px] border-ink bg-[var(--shop-floor)] p-1">
          <img src={portrait} alt={`${r.name}`} width={64} height={84} style={pixelated} />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="relative border-2 border-ink bg-panel px-2 py-1.5 font-body text-sm leading-snug text-panel-foreground">
            “{line.text}”
          </p>
          <div className="flex items-center justify-between gap-2">
            <Hearts n={friendship[residentId]} />
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-panel-muted">
              {friendship[residentId] >= MAX_HEARTS ? "best friends" : "friendship"}
            </span>
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ---------------- door whiteboard ---------------- */

const WhiteboardPopup = ({ payload }: { payload: Extract<PopupPayload, { kind: "whiteboard" }> }) => {
  const { dailyAnswers } = usePlayerState();
  const prompt = promptForToday();
  const entry = dailyAnswers[todayKey()];
  const mine = entry?.promptId === prompt.id ? entry.answer : null;
  const isMine = payload.residentId === MY_ROOM_ID;
  const answer = isMine ? mine : residentPick(payload.residentId, prompt);
  return (
    <Shell accent={payload.accent} title={isMine ? "Your door board" : `${payload.name}'s door board`} subtitle="today's question">
      <p className="font-body text-xs text-panel-muted">{prompt.question}</p>
      <div className="mt-1 flex items-center gap-2 border-2 border-ink bg-[var(--polaroid)] px-2 py-1.5">
        {!isMine ? <Head accent={payload.accent} /> : null}
        <span className="font-display text-sm font-bold text-ink">
          {answer ?? "? — answer at the hallway corkboard"}
        </span>
        {!isMine && mine && mine === answer ? <YouToo accent={payload.accent} /> : null}
      </div>
    </Shell>
  );
};

/** how many things Sam's current popup shows in common with you (null when it isn't Sam's) */
const SAM_ID = "room-2";
const samCommonFor = (
  payload: PopupPayload,
  mine: { songs: Song[]; bulletin: Bulletin; watching: NowWatching; daily: string | null },
): number | null => {
  const sam = ROOMS.find((r) => r.id === SAM_ID)!;
  if (payload.kind === "whiteboard")
    return payload.residentId === SAM_ID
      ? Number(!!mine.daily && mine.daily === residentPick(SAM_ID, promptForToday()))
      : null;
  if (!("room" in payload) || payload.room.id !== SAM_ID) return null;
  if (payload.kind === "songs") return countSongCommon(sam.songs, mine.songs);
  if (payload.kind === "bulletin") return pinMatches(sam.bulletin, mine.bulletin).filter(Boolean).length;
  if (payload.kind === "watching") {
    const m = showMatches(sam.nowWatching ?? { title: "" }, mine.watching);
    return (m.title ? 1 : 0) + m.upNext.filter(Boolean).length;
  }
  return 0;
};

/* ---------------- root ---------------- */

export const DormPopup = ({
  payload,
  thumbnails = {},
  itemThumbnails = {},
}: {
  payload: PopupPayload | null;
  thumbnails?: Record<string, string>;
  /** tinted per-item thumbnails keyed by item id (mail finds) */
  itemThumbnails?: Record<string, { src: string }>;
}) => {
  const { mySongs, myBulletin, myNowWatching, dailyAnswers, questsDone, playerName } = usePlayerState();
  const [editing, setEditing] = useState(false);
  /** "{name}'s Room" for yours (display only — the id still identifies it) */
  const titleOf = (room: PersonRoom) => (room.id === MY_ROOM_ID ? roomNameFor(playerName) : room.name);
  const kind = payload?.kind ?? null;

  // leaving a prop (or switching props) always drops back to the display view
  useEffect(() => {
    setEditing(false);
  }, [kind]);

  // welcome quest: a "you too" with Sam — or, if you share nothing at all, just visiting Sam
  const todayEntry = dailyAnswers[todayKey()];
  const myDaily = todayEntry?.promptId === promptForToday().id ? todayEntry.answer : null;
  const samDone = questsDone.includes("sam");
  useEffect(() => {
    if (!payload || samDone) return;
    const mine = { songs: mySongs, bulletin: myBulletin, watching: myNowWatching, daily: myDaily };
    const here = samCommonFor(payload, mine);
    if (here === null) return;
    const sam = ROOMS.find((r) => r.id === SAM_ID)!;
    const total = (["songs", "bulletin", "watching"] as const).reduce(
      (a, k) => a + (samCommonFor({ kind: k, room: sam }, mine) ?? 0),
      0,
    );
    if (here > 0 || total === 0) playerActions.completeQuest("sam");
  }, [payload, samDone, mySongs, myBulletin, myNowWatching, myDaily]);

  if (!payload) return null;

  if (payload.kind === "package") return <PackagePopup itemThumbnails={itemThumbnails} />;
  if (payload.kind === "resident") return <ResidentPopup key={payload.residentId} residentId={payload.residentId} />;
  if (payload.kind === "whiteboard") return <WhiteboardPopup payload={payload} />;

  if (payload.kind === "songs") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const songs = mine ? mySongs : room.songs;
    const matches = mine ? undefined : songMatches(songs, mySongs);
    const common = mine ? 0 : countSongCommon(songs, mySongs);
    return (
      <Shell
        accent={room.accentColor}
        title={`${titleOf(room)} — Top 5`}
        subtitle={MOODS[room.mood].label}
        interactive={mine}
        variant="crate"
        badge={<CommonChip count={common} accent={room.accentColor} />}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <SongsEdit
            songs={songs}
            mood={room.mood}
            onSave={(s) => {
              playerActions.setSongs(s);
              setEditing(false);
            }}
          />
        ) : (
          <SongsView room={room} songs={songs} {...(matches ? { matches } : {})} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "bulletin") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const bulletin = mine ? myBulletin : room.bulletin;
    const matches = mine ? undefined : pinMatches(bulletin, myBulletin);
    const common = matches
      ? new Set(bulletin.pins.filter((_, i) => matches[i]).map((p) => pinMatchKey(p))).size
      : 0;
    return (
      <Shell
        accent={room.accentColor}
        title={`${titleOf(room)} — Bulletin board`}
        interactive={mine}
        variant="cork"
        badge={<CommonChip count={common} accent={room.accentColor} />}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <BulletinEdit
            room={room}
            bulletin={bulletin}
            onSave={(b) => {
              playerActions.setBulletin(b);
              setEditing(false);
            }}
          />
        ) : (
          <Board room={room} pins={bulletin.pins} {...(matches ? { matches } : {})} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "watching") {
    const room = payload.room;
    const mine = room.id === MY_ROOM_ID;
    const watching = mine ? myNowWatching : (room.nowWatching ?? { title: "Nothing on" });
    const match = mine ? undefined : showMatches(watching, myNowWatching);
    const common = match ? (match.title ? 1 : 0) + match.upNext.filter(Boolean).length : 0;
    return (
      <Shell
        accent={room.accentColor}
        title={`${titleOf(room)} — Now watching`}
        interactive={mine}
        variant="crt"
        badge={<CommonChip count={common} accent={room.accentColor} />}
        {...(mine ? { onEdit: () => setEditing((v) => !v), editing } : {})}
      >
        {mine && editing ? (
          <WatchingEdit
            watching={watching}
            accent={room.accentColor}
            onSave={(w) => {
              playerActions.setNowWatching(w);
              setEditing(false);
            }}
          />
        ) : (
          <WatchingView room={room} watching={watching} {...(match ? { match } : {})} />
        )}
      </Shell>
    );
  }

  if (payload.kind === "companion") {
    const room = payload.room;
    const c = room.companion;
    return (
      <Shell accent={room.accentColor} title={c.name} subtitle={c.breed}>
        <div className="flex items-center gap-3 border-[3px] border-ink bg-panel-foreground/5 p-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center border-[3px] border-ink font-display text-lg font-bold text-ink"
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

  if (payload.kind === "art") {
    const src = thumbnails[payload.textureKey];
    return (
      <Shell accent={payload.accent ?? "#8d8090"} title={payload.title} subtitle="wall art">
        <div className="flex flex-col items-center gap-2 border-2 border-ink bg-panel-foreground/5 p-3">
          {src ? (
            <img
              src={src}
              alt={payload.title}
              width={360}
              height={220}
              className="w-full max-w-[340px] border-2 border-ink [image-rendering:pixelated]"
            />
          ) : (
            <span className="font-body text-xs text-panel-muted">loading art…</span>
          )}
          <span className="font-display text-sm font-bold text-panel-foreground">
            {payload.title}
          </span>
        </div>
      </Shell>
    );
  }

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

/** short label for the phone "Tap to open" pill */
export const popupTitle = (p: PopupPayload, playerName: string): string => {
  switch (p.kind) {
    case "songs":
    case "bulletin":
    case "watching": {
      const name = p.room.id === MY_ROOM_ID ? roomNameFor(playerName) : p.room.name;
      return `${name} — ${p.kind === "songs" ? "Top 5" : p.kind === "bulletin" ? "Bulletin" : "Now watching"}`;
    }
    case "companion":
      return p.room.companion.name;
    case "corkboard":
      return "Question of the day";
    case "package":
      return "Mail cubby";
    case "whiteboard":
      return p.residentId === MY_ROOM_ID ? "Your door board" : `${p.name}'s door board`;
    case "art":
    case "flavor":
      return p.title;
    case "resident":
      return `Talk to ${RESIDENTS[p.residentId].name}`;
  }
};
