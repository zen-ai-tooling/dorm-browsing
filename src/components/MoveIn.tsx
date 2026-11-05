import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MOODS, type MoodKey } from "@/data/dorm";
import { randomLook } from "@/data/avatar";
import { STICKER_GROUPS, STICKERS, type StickerGroup } from "@/data/stickers";
import { coverFor } from "@/lib/coverArt";
import { playerActions, usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import type { DormScene } from "@/game/DormScene";
import { AvatarCreator } from "./AvatarCreator";
import { GamePanel } from "./GamePanel";
import { PixelIcon } from "./PixelIcon";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const pixelated: CSSProperties = { imageRendering: "pixelated" };

const MOOD_LINE: Record<MoodKey, string> = {
  chill_ambient: "Lo-fi on low, plants everywhere, teal light.",
  energetic_dance: "Bass up, coral walls, door always open.",
  cozy_soft: "Blankets, lavender walls, fairy-light hours.",
};

const btn =
  "rounded-[3px] border-2 border-ink px-3 py-1.5 font-display text-sm font-bold transition disabled:opacity-50";
const input =
  "h-8 w-full rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-sm text-panel-foreground outline-none";

type Step = 1 | 2 | 3 | 4 | 5;

/**
 * Move-In Day: five short steps over the live game. The room behind updates as you go
 * (avatar, mood); "Skip setup" keeps a random avatar and the defaults.
 */
export const MoveIn = ({ scene, onDone }: { scene: DormScene; onDone: () => void }) => {
  const { avatar, playerName, myMood, ownedItemIds } = usePlayerState();
  const [step, setStep] = useState<Step>(1);
  const [stickers, setStickers] = useState<string[]>([]);
  const [group, setGroup] = useState<StickerGroup>("Music");
  const [song, setSong] = useState({ title: "", artist: "" });
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    scene.startMoveIn();
  }, [scene]);

  const go = (s: Step) => {
    sfx.uiClick();
    setStep(s);
  };

  const meetFloor = async () => {
    setBusy(true);
    await scene.popBoxes();
    setBusy(false);
    setStep(5);
    scene.glideTour(() => {
      playerActions.finishMoveIn();
      onDone();
    });
  };

  const skip = () => {
    sfx.uiClick();
    playerActions.setAvatar(randomLook());
    void meetFloor();
  };

  const cover = useMemo(
    () => (song.title.trim() ? coverFor(song.title, song.artist, myMood) : ""),
    [song.title, song.artist, myMood],
  );

  if (step === 5)
    return (
      <button
        type="button"
        aria-label="Skip the tour"
        onClick={() => scene.skipTour()}
        className="absolute inset-0 z-40 flex items-start justify-center bg-transparent pt-6"
      >
        <GamePanel accent="#7f9c86" className="px-3 py-2">
          <p className="font-display text-sm font-bold text-panel-foreground">Meet the floor</p>
          <p className="font-body text-[11px] text-panel-muted">Sam · Jordan · the Common Lounge — tap to skip</p>
        </GamePanel>
      </button>
    );

  const skipLink = (
    <button
      type="button"
      onClick={skip}
      disabled={busy}
      className="font-body text-[11px] text-panel-muted underline underline-offset-2 hover:text-panel-foreground"
    >
      Skip setup
    </button>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <GamePanel
        accent="#c9a227"
        className="pointer-events-auto max-h-[72vh] w-[min(100%,540px)] overflow-y-auto p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest text-panel-muted">
            Move-In Day · {step}/5
          </span>
          {skipLink}
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-panel-foreground">
              Welcome to Floor 3. Room 301 is yours.
            </h2>
            <p className="font-body text-sm text-panel-muted">Boxes are in. Let's make it feel like you.</p>
            <button type="button" className={`${btn} bg-ink text-panel`} onClick={() => go(2)}>
              Let's move in
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-panel-foreground">Make yourself</h2>
            <AvatarCreator
              look={avatar}
              onChange={playerActions.setAvatar}
              name={playerName}
              onNameChange={playerActions.setPlayerName}
              ownedItemIds={ownedItemIds}
            />
            <div className="flex justify-end">
              <button type="button" className={`${btn} bg-ink text-panel`} onClick={() => go(3)}>
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-panel-foreground">Pick your vibe</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(MOODS) as MoodKey[]).map((k) => {
                const m = MOODS[k];
                const on = myMood === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      sfx.uiClick();
                      playerActions.setMyMood(k);
                    }}
                    className={`flex flex-col gap-1.5 border-[3px] border-ink p-2 text-left ${
                      on ? "bg-ink/10 outline outline-2 outline-offset-2 outline-ink" : "bg-panel hover:bg-panel-foreground/5"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-10 w-full border-2 border-ink"
                      style={{
                        backgroundColor: hex(m.wall),
                        boxShadow: `inset 0 -10px 0 0 ${hex(m.wallpaper)}, inset 0 -12px 0 0 ${hex(m.posterAccent)}`,
                      }}
                    />
                    <span className="font-display text-sm font-bold capitalize text-panel-foreground">{m.label}</span>
                    <span className="font-body text-[11px] leading-snug text-panel-muted">{MOOD_LINE[k]}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <button type="button" className={`${btn} bg-panel text-panel-foreground`} onClick={() => go(2)}>
                Back
              </button>
              <button type="button" className={`${btn} bg-ink text-panel`} onClick={() => go(4)}>
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-panel-foreground">Unpack</h2>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-display text-xs font-bold text-panel-foreground">
                  Pin 3 things you're into
                </span>
                <span className="font-body text-[11px] font-bold tabular-nums text-panel-muted">
                  {stickers.length}/3
                </span>
              </div>
              <div className="mb-1.5 flex flex-wrap gap-1">
                {STICKER_GROUPS.map((g) => (
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
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {STICKERS.filter((st) => st.group === group).map((st) => {
                  const on = stickers.includes(st.id);
                  const full = !on && stickers.length >= 3;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      aria-pressed={on}
                      disabled={full}
                      onClick={() => {
                        sfx.uiClick();
                        setStickers((cur) => (on ? cur.filter((x) => x !== st.id) : [...cur, st.id]));
                      }}
                      className={`flex flex-col items-center gap-0.5 border-2 border-ink p-1 disabled:opacity-40 ${
                        on ? "bg-primary/30" : "bg-panel hover:bg-panel-foreground/10"
                      }`}
                    >
                      <PixelIcon def={st} size={24} />
                      <span className="line-clamp-2 text-center font-body text-[10px] leading-tight text-panel-foreground">
                        {st.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="font-display text-xs font-bold text-panel-foreground">One song on repeat right now</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex size-12 shrink-0 items-center justify-center border-2 border-ink bg-panel-foreground/10">
                  {cover ? <img src={cover} alt="" width={44} height={44} style={pixelated} /> : null}
                </span>
                <div className="grid min-w-0 flex-1 gap-1">
                  <input
                    className={input}
                    value={song.title}
                    maxLength={40}
                    placeholder="Song title"
                    onChange={(e) => setSong((s) => ({ ...s, title: e.target.value }))}
                  />
                  <input
                    className={input}
                    value={song.artist}
                    maxLength={40}
                    placeholder="Artist"
                    onChange={(e) => setSong((s) => ({ ...s, artist: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" className={`${btn} bg-panel text-panel-foreground`} onClick={() => go(3)}>
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                className={`${btn} bg-ink text-panel`}
                onClick={() => {
                  sfx.uiClick();
                  playerActions.unpack(stickers, song.title.trim() ? song : null);
                  void meetFloor();
                }}
              >
                Unpack
              </button>
            </div>
          </div>
        ) : null}
      </GamePanel>
    </div>
  );
};
