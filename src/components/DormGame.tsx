import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Flame, Mail, Pencil, Store, UserRound, Volume2, VolumeX } from "lucide-react";
import { WelcomeQuests } from "./WelcomeQuests";
import type { PopupPayload } from "@/data/dorm";
import { buildItemThumbs, type ItemThumb } from "@/lib/itemThumbs";
import { featuredForToday, ITEM_CATALOG, zoomTextureKey } from "@/data/items";
import { Button } from "@/components/ui/button";
import { DormPopup, PopupSheetContext, popupTitle } from "./DormPopup";
import { AvatarCreator } from "./AvatarCreator";
import { MoveIn } from "./MoveIn";
import { effectiveLook } from "@/data/avatar";
import { outfitThumbs } from "@/lib/avatarCanvas";
import { useIsPhone, useIsTouch } from "@/hooks/use-media-query";
import { GamePanel, IconChip } from "./GamePanel";
import { RoomEditorTray } from "./RoomEditorTray";
import { WallpaperPicker } from "./WallpaperPicker";
import { ShopPanel } from "./ShopPanel";
import { promptForToday, todayKey } from "@/data/prompts";
import { toast } from "sonner";
import {
  devActions,
  getPlayerState,
  hydrateDevMode,
  hydratePlayerState,
  playerActions,
  useDevMode,
  usePlayerState,
} from "@/lib/playerStore";
import { CoinAmount } from "./CoinAmount";
import { DevPanel } from "./DevPanel";
import { sfx } from "@/game/sounds";
import type { DormScene } from "@/game/DormScene";
import { currentHour, currentPhase, hydrateTimeOverride, useTimeVersion } from "@/lib/timeStore";
import { roomRemark, RESIDENTS, type ResidentId } from "@/data/residents";
import { roomInfoFor } from "@/lib/residentTalk";
import { PhaseChip } from "./PhaseChip";

const DormGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DormScene | null>(null);
  const [popup, setPopup] = useState<PopupPayload | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inMyRoom, setInMyRoom] = useState(false);
  const [placingItemId, setPlacingItemId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  /** per item id, tinted exactly like the room renders it (see displayTintFor) */
  const [itemThumbs, setItemThumbs] = useState<Record<string, ItemThumb>>({});
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const {
    coins,
    muted,
    currentStreak,
    lastShopSeenDate,
    myWallpaperId,
    seenControls,
    dailyAnswers,
    lastPackageDate,
    avatar,
    playerName,
    myMood,
    onboarded,
    avatarNewsSeen,
    ownedItemIds,
  } = usePlayerState();
  const isTouch = useIsTouch();
  const isPhone = useIsPhone();
  const [hydrated, setHydrated] = useState(false);
  const [scene, setScene] = useState<DormScene | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const moveIn = hydrated && !!scene && !onboarded;
  const packageReady = lastPackageDate !== todayKey();
  const [hintOpen, setHintOpen] = useState<boolean | null>(null);
  const showHint = hintOpen ?? !seenControls;
  const trayWrapRef = useRef<HTMLDivElement>(null);
  const hasNewFeatured = featuredForToday().length > 0 && lastShopSeenDate !== todayKey();


  const devMode = useDevMode();

  useEffect(() => {
    hydratePlayerState();
    hydrateDevMode();
    hydrateTimeOverride();
    setHydrated(true);
  }, []);

  // live avatar / room mood / name in the world
  useEffect(() => {
    sceneRef.current?.applyAvatar();
  }, [avatar]);
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    sc.applyMyMood();
    setItemThumbs(buildItemThumbs(sc, myMood));
  }, [myMood]);
  useEffect(() => {
    sceneRef.current?.applyMyName();
  }, [playerName]);

  // saves from before avatars: one gentle nudge
  useEffect(() => {
    if (!hydrated || avatarNewsSeen || !onboarded) return;
    playerActions.markAvatarNewsSeen();
    toast("New: make your avatar", {
      duration: 8000,
      action: { label: "Make it", onClick: () => setAvatarOpen(true) },
    });
  }, [hydrated, avatarNewsSeen, onboarded]);

  // a popup is "nearby" until tapped open on touch devices; a new one starts closed
  useEffect(() => {
    setSheetOpen(false);
  }, [popup]);

  // dev time override (panel or ?time=) applies right away, with the usual crossfade
  const timeVersion = useTimeVersion();
  useEffect(() => {
    sceneRef.current?.refreshPhase();
    sceneRef.current?.refreshResidents();
  }, [timeVersion]);

  // residents: knock pill at their door, "Sold at Floor 3 Supply" hints in their rooms
  const [knockSpot, setKnockSpot] = useState<ResidentId | null>(null);
  const [soldHint, setSoldHint] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const hintTimer = useRef<number | undefined>(undefined);
  const [shopFocus, setShopFocus] = useState<string | null>(null);
  const showSoldHint = (h: { itemId: string; x: number; y: number } | null) => {
    window.clearTimeout(hintTimer.current);
    if (h) {
      setSoldHint(h);
      // touch: the hint lingers long enough to tap it; desktop hides on mouse-out (with a grace period)
      hintTimer.current = window.setTimeout(() => setSoldHint(null), 4000);
    } else hintTimer.current = window.setTimeout(() => setSoldHint(null), 700);
  };

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = await import("phaser");
      const { DormScene } = await import("@/game/DormScene");
      // Phaser draws canvas text with whatever is loaded — wait for the display font first.
      try {
        await Promise.race([
          Promise.all([
            document.fonts.load('16px "Pixelify Sans"'),
            document.fonts.load('700 16px "Pixelify Sans"'),
          ]),
          new Promise((r) => setTimeout(r, 2500)),
        ]);
      } catch {
        /* fall back to default font rendering */
      }
      if (destroyed || !containerRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: "#2b2431",
        pixelArt: true,
        roundPixels: true,
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [DormScene],
      });
      game.scene.start("dorm", {
        onPopup: (p: PopupPayload | null) => setPopup(p),
        getMyLayout: () => getPlayerState().roomLayout,
        onLayoutChange: playerActions.setRoomLayout,
        onInsideRoom: setInMyRoom,
        onPlacingChange: setPlacingItemId,
        getWallpaperId: () => getPlayerState().myWallpaperId,
        onWallTap: () => setWallpaperOpen(true),
        getPhase: () => currentPhase(),
        getMyDailyAnswer: () => {
          const e = getPlayerState().dailyAnswers[todayKey()];
          return e && e.promptId === promptForToday().id ? e.answer : null;
        },
        isPackageReady: () => getPlayerState().lastPackageDate !== todayKey(),
        getAvatar: () => effectiveLook(getPlayerState().avatar, ITEM_CATALOG),
        onAvatarTap: () => {
          sfx.uiClick();
          setAvatarOpen(true);
        },
        getMyMood: () => getPlayerState().myMood,
        getPlayerName: () => getPlayerState().playerName,
        getHour: () => currentHour(),
        onKnockSpot: setKnockSpot,
        onSoldHint: showSoldHint,
        getVisitLine: (id: ResidentId) => {
          const st = getPlayerState();
          if (st.lastVisitDate === todayKey()) return null;
          return roomRemark(id, roomInfoFor(st));
        },
        onVisitLine: (id: ResidentId, line: string) => {
          playerActions.markVisited();
          toast(`${RESIDENTS[id].name} stopped by your door`, { description: `“${line}”`, duration: 7000 });
        },
        onReady: (scene: DormScene) => {
          sceneRef.current = scene;
          setScene(scene);

          (window as unknown as { __scene?: DormScene }).__scene = scene;
          const map: Record<string, string> = {};
          for (const item of Object.values(ITEM_CATALOG)) {
            for (const key of [item.textureKey, zoomTextureKey(item.textureKey)]) {
              if (map[key]) continue;
              const url = scene.getTextureDataUrl(key);
              if (url) map[key] = url;
            }
          }
          setThumbs(map);
          setItemThumbs(buildItemThumbs(scene, getPlayerState().myMood));
        },
      });
    })();

    return () => {
      destroyed = true;
      sceneRef.current = null;
      setScene(null);
      game?.destroy(true);
    };
  }, []);

  // collapse the controls card after the first move (or 10s); returning players start collapsed
  useEffect(() => {
    if (seenControls) return;
    const done = () => {
      playerActions.markControlsSeen();
      setHintOpen(null);
    };
    const moveKeys = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
    const onKey = (e: KeyboardEvent) => {
      if (moveKeys.has(e.key.toLowerCase())) done();
    };
    const el = containerRef.current;
    window.addEventListener("keydown", onKey);
    el?.addEventListener("pointerdown", done);
    const timer = window.setTimeout(done, 10000);
    return () => {
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("pointerdown", done);
      window.clearTimeout(timer);
    };
  }, [seenControls]);

  // edit mode: frame the room above the tray (measured from the DOM)
  useEffect(() => {
    if (!editing) return;
    const frame = () => {
      const tray = trayWrapRef.current?.firstElementChild as HTMLElement | null;
      const host = containerRef.current;
      if (!host) return;
      let inset = 0;
      if (tray) {
        const hr = host.getBoundingClientRect();
        inset = Math.max(0, hr.bottom - tray.getBoundingClientRect().top);
      }
      sceneRef.current?.frameMyRoom(inset);
    };
    const raf = requestAnimationFrame(frame);
    window.addEventListener("resize", frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", frame);
    };
  }, [editing, wallpaperOpen]);

  useEffect(() => {
    sceneRef.current?.applyWallpaper();
  }, [myWallpaperId]);

  // door whiteboards + the cubby package follow today's answer and package state
  useEffect(() => {
    sceneRef.current?.refreshDaily();
  }, [dailyAnswers, lastPackageDate]);

  // Escape backs out of placing mode / selection even when the canvas isn't focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") sceneRef.current?.escape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // hidden dev switch: 3 title taps within 1s toggles dev mode and leaves the hint as it was
  const titleTapsRef = useRef<number[]>([]);
  const hintBeforeTapsRef = useRef<boolean | null>(null);
  const onTitleTap = () => {
    const now = Date.now();
    let taps = titleTapsRef.current;
    if (taps.length > 0 && now - taps[0]! > 1000) taps = [];
    if (taps.length === 0) hintBeforeTapsRef.current = hintOpen;
    taps = [...taps, now];
    if (taps.length >= 3) {
      titleTapsRef.current = [];
      setHintOpen(hintBeforeTapsRef.current);
      const on = devActions.toggleEnabled();
      sfx.uiClick();
      toast(on ? "Dev mode on" : "Dev mode off");
      return;
    }
    titleTapsRef.current = taps;
    setHintOpen(!showHint);
  };

  /** shop thumbnails: room items as tinted in your room, outfits on your own avatar */
  const shopThumbs = useMemo(() => ({ ...itemThumbs, ...outfitThumbs(avatar) }), [itemThumbs, avatar]);

  const toggleEdit = (on: boolean) => {
    setEditing(on);
    if (!on) setWallpaperOpen(false);
    sceneRef.current?.setEditMode(on);
    if (!on) sceneRef.current?.restoreCamera();
  };


  const phase = usePhase();

  const openShop = () => {
    sfx.uiClick();
    playerActions.markShopSeen();
    setShopOpen(true);
  };
  const openAvatar = () => {
    sfx.uiClick();
    setAvatarOpen(true);
  };

  const mailDot = (
    <span
      aria-label="Unopened package"
      className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-ink bg-primary"
    />
  );
  const shopDot = hasNewFeatured ? (
    <span
      aria-label="New featured items in the shop"
      className="pointer-events-none absolute -right-1 -top-1 size-3 rounded-full border-2 border-ink bg-primary"
    />
  ) : null;
  const soundIcon = muted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />;

  /** any popup/sheet/panel is up — the quest card collapses to its chip */
  const overlayOpen =
    (!!popup && (isTouch ? sheetOpen : true)) || shopOpen || avatarOpen || (editing && wallpaperOpen);

  const popupLayer = editing ? null : isTouch ? (
    popup ? (
      sheetOpen ? (
        <PopupSheetContext.Provider value={{ sheet: true, onClose: () => setSheetOpen(false) }}>
          <DormPopup payload={popup} thumbnails={thumbs} itemThumbnails={itemThumbs} />
        </PopupSheetContext.Provider>
      ) : (
        <div
          className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center ${
            isPhone ? "bottom-[calc(8.25rem+env(safe-area-inset-bottom))]" : "bottom-5"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              sfx.popupOpen();
              setSheetOpen(true);
            }}
            className="pointer-events-auto animate-in fade-in slide-in-from-bottom-2 rounded-[3px] border-[3px] border-ink bg-panel px-3 py-1.5 font-display text-xs font-bold text-panel-foreground shadow-[0_3px_0_0_var(--color-ink)] duration-150"
          >
            Tap to open · {popupTitle(popup, playerName)}
          </button>
        </div>
      )
    ) : null
  ) : (
    <DormPopup payload={popup} thumbnails={thumbs} itemThumbnails={itemThumbs} />
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[6px] border-[6px] border-ink bg-secondary shadow-[0_10px_0_-2px_rgba(36,28,38,0.25)]">
      <div
        ref={containerRef}
        className="h-full w-full touch-none [&>canvas]:block"
        onDragOver={(e) => {
          if (editing) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!editing) return;
          e.preventDefault();
          const itemId = e.dataTransfer.getData("text/plain");
          const rect = e.currentTarget.getBoundingClientRect();
          if (itemId)
            sceneRef.current?.placeFromTray(itemId, {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
        }}
      />

      {moveIn ? null : isPhone ? (
        editing ? null : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            <div className="game-panel pointer-events-auto flex items-center justify-between gap-1 overflow-x-auto px-1.5 py-1.5 [&>*]:shrink-0 [&_button]:px-2">
              {hud}
            </div>
          </div>
        )
      ) : (
        <div className="pointer-events-none absolute left-4 top-4 space-y-2">
          <GamePanel accent="#7f9c86" className="pointer-events-auto px-3 py-2">
            <button
              type="button"
              aria-expanded={showHint}
              onClick={onTitleTap}
              className="block text-left font-display text-sm font-bold tracking-wide text-panel-foreground"
            >
              Dorm Vibes · Floor 3
            </button>
            {showHint ? (
              <>
                <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                  {isTouch ? "Tap anywhere to walk" : "WASD / arrows or click a tile to walk"}
                </p>
                <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                  {isTouch ? "Walk up to things, then tap to open" : "Wander up to things — they open on their own"}
                </p>
              </>
            ) : null}
          </GamePanel>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">{hud}</div>
        </div>
      )}

      {editing && wallpaperOpen ? (
        <WallpaperPicker
          equippedId={myWallpaperId}
          thumbnails={thumbs}
          onPick={(id) => {
            playerActions.setWallpaper(id);
            setWallpaperOpen(false);
          }}
          onClose={() => setWallpaperOpen(false)}
        />
      ) : null}

      {editing && !wallpaperOpen ? (
        <div ref={trayWrapRef} className="contents">
          <RoomEditorTray
            onDone={() => toggleEdit(false)}
            onTrayClick={(itemId) => sceneRef.current?.togglePlacing(itemId)}
            onCancelPlacing={() => sceneRef.current?.cancelPlacing()}
            placingItemId={placingItemId}
            thumbnails={thumbs}
            itemThumbnails={itemThumbs}
          />
        </div>
      ) : moveIn ? null : (
        popupLayer
      )}

      <WelcomeQuests hidden={editing || moveIn || !onboarded} docked={isPhone} />

      {knockSpot && !editing && !moveIn ? (
        <div
          className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center ${
            isPhone ? "bottom-[calc(10.75rem+env(safe-area-inset-bottom))]" : "top-4"
          }`}
        >
          <button
            type="button"
            onClick={() => sceneRef.current?.knock(knockSpot)}
            className="pointer-events-auto rounded-[3px] border-[3px] border-ink bg-[var(--crate-wood)] px-3 py-1.5 font-display text-xs font-bold text-[var(--tag-standard)] shadow-[0_3px_0_0_var(--color-ink)]"
          >
            Knock on {RESIDENTS[knockSpot].name}'s door
          </button>
        </div>
      ) : null}

      {soldHint && !editing ? (
        <button
          type="button"
          onMouseEnter={() => window.clearTimeout(hintTimer.current)}
          onMouseLeave={() => showSoldHint(null)}
          onClick={() => {
            sfx.uiClick();
            setShopFocus(soldHint.itemId);
            setShopOpen(true);
            setSoldHint(null);
          }}
          className="absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[3px] border-2 border-ink bg-panel px-1.5 py-0.5 font-display text-[10px] font-bold text-panel-foreground shadow-[0_2px_0_0_var(--color-ink)]"
          style={{ left: soldHint.x, top: soldHint.y - 4 }}
        >
          {ITEM_CATALOG[soldHint.itemId]?.name} · Sold at Floor 3 Supply →
        </button>
      ) : null}

      {moveIn && scene ? <MoveIn scene={scene} onDone={() => setHintOpen(null)} /> : null}

      {avatarOpen && !moveIn ? (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAvatarOpen(false);
          }}
        >
          <GamePanel accent="#6c9aa2" className="max-h-[88%] w-[min(100%,520px)] overflow-y-auto p-4">
            <h2 className="mb-2 font-display text-base font-bold text-panel-foreground">You</h2>
            <AvatarCreator
              look={avatar}
              onChange={playerActions.setAvatar}
              name={playerName}
              onNameChange={playerActions.setPlayerName}
              ownedItemIds={ownedItemIds}
              footer={
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sfx.uiClick();
                      setAvatarOpen(false);
                    }}
                    className="rounded-[3px] border-2 border-ink bg-ink px-4 py-1.5 font-display text-sm font-bold text-panel"
                  >
                    Done
                  </button>
                </div>
              }
            />
          </GamePanel>
        </div>
      ) : null}

      {devMode.enabled ? (
        <DevPanel
          onLayoutReset={() => sceneRef.current?.reloadMyLayout()}
          onTriggerVisit={() => sceneRef.current?.maybeVisit(true) ?? false}
        />
      ) : null}

      <ShopPanel
        open={shopOpen}
        onOpenChange={(v) => {
          setShopOpen(v);
          if (!v) setShopFocus(null);
        }}
        focusItemId={shopFocus}
        thumbnails={shopThumbs}
        onPlaceNow={(itemId) => {
          // close the shop, enter edit mode, and go straight into tap-to-place
          setShopOpen(false);
          if (!editing) toggleEdit(true);
          setWallpaperOpen(false);
          requestAnimationFrame(() => {
            if (placingItemId !== itemId) sceneRef.current?.togglePlacing(itemId);
          });
        }}
      />
    </div>
  );
};

export default DormGame;
