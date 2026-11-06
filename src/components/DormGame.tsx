import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleHelp,
  Cloud,
  CloudOff,
  Coins,
  Flame,
  Mail,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Store,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { WelcomeQuests } from "./WelcomeQuests";
import type { PopupPayload } from "@/data/dorm";
import { buildItemThumb, buildItemThumbs, type ItemThumb } from "@/lib/itemThumbs";
import { featuredForToday, ITEM_CATALOG, zoomTextureKey } from "@/data/items";
import { Button } from "@/components/ui/button";
import { DormPopup, PopupSheetContext, popupTitle } from "./DormPopup";
import { AvatarCreator } from "./AvatarCreator";
import { MoveIn } from "./MoveIn";
import { effectiveLook } from "@/data/avatar";
import { outfitThumbs } from "@/lib/avatarCanvas";
import { useIsPhone, useIsTouch } from "@/hooks/use-media-query";
import { GamePanel, IconChip } from "./GamePanel";
import { RoomEditorTray, type TrayTab } from "./RoomEditorTray";
import { WallpaperPicker } from "./WallpaperPicker";
import { ShopPanel } from "./ShopPanel";
import { promptForToday, todayKey } from "@/data/prompts";
import { toast } from "sonner";
import {
  canAfford,
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
import { SaveDormPanel } from "./SaveDormPanel";
import { ConflictDialog } from "./ConflictDialog";
import { FeedbackPanel } from "./FeedbackPanel";
import { initAuth, signOutToGuest, useAuth } from "@/lib/auth";
import { startSaveSync, useSaveSync } from "@/lib/saveSync";
import { sfx } from "@/game/sounds";
import type { DormScene } from "@/game/DormScene";
import { currentHour, currentPhase, hydrateTimeOverride, usePhase, useTimeVersion } from "@/lib/timeStore";
import { roomRemark, RESIDENTS, type ResidentId } from "@/data/residents";
import { roomInfoFor } from "@/lib/residentTalk";
import { PHASE_LABEL } from "@/game/timeOfDay";
import { PhaseChip, PHASE_GLYPHS } from "./PhaseChip";
import { PixelIcon } from "./PixelIcon";

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
    myFloorId,
    door,
    roomLayout,
  } = usePlayerState();
  const [trayTab, setTrayTab] = useState<TrayTab>("furniture");
  /** placed colours, so thumbnails only rebuild when a recolor actually changes something */
  const tintKey = roomLayout.map((p) => `${p.itemId}:${p.tint ?? ""}`).join("|");
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

  // ---------- accounts (Iteration 27) ----------
  const auth = useAuth();
  const syncState = useSaveSync();
  const [meOpen, setMeOpen] = useState(false);
  const [savePanel, setSavePanel] = useState<"save" | "signin" | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [nudge, setNudge] = useState(false);
  const wasOnboarded = useRef<boolean | null>(null);
  const isGuest = auth.ready && auth.isAnonymous;

  // soft "save your dorm" nudge: after move-in, first purchase, 3rd day — at most once a day
  useEffect(() => {
    const justOnboarded = wasOnboarded.current === false && onboarded;
    wasOnboarded.current = onboarded;
    if (!auth.ready || !auth.isAnonymous || !onboarded) return;
    const today = todayKey();
    try {
      if (window.localStorage.getItem("dorm-vibes-save-nudge") === today) return;
    } catch {
      /* storage blocked */
    }
    const daysPlayed = Object.keys(dailyAnswers).length;
    const firstPurchase = ownedItemIds.length > DEFAULT_OWNED_COUNT;
    if (justOnboarded || firstPurchase || daysPlayed >= 3) setNudge(true);
  }, [auth.ready, auth.isAnonymous, onboarded, ownedItemIds.length, dailyAnswers]);

  const dismissNudge = () => {
    setNudge(false);
    try {
      window.localStorage.setItem("dorm-vibes-save-nudge", todayKey());
    } catch {
      /* storage blocked */
    }
  };

  /** where/what the tester was doing — attached to every feedback row */
  const feedbackContext = (): Record<string, unknown> => ({
    hour: currentHour(),
    phase: currentPhase(),
    zone: sceneRef.current?.playerZoneLabel() ?? "",
    popup: popup ? popupTitle(popup, playerName) : null,
    editing,
    shopOpen,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    device: isTouch ? "touch" : "desktop",
    coins,
    daysPlayed: Object.keys(dailyAnswers).length,
    onboarded,
    buildTime: new Date(document.lastModified).toISOString(),
  });

  const syncIcon =
    syncState.status === "offline" ? (
      <CloudOff className="size-3.5" aria-hidden />
    ) : syncState.status === "saving" ? (
      <RefreshCw className="size-3.5 animate-spin" aria-hidden />
    ) : (
      <Cloud className="size-3.5" aria-hidden />
    );

  const openMe = () => {
    sfx.uiClick();
    setSignOutConfirm(false);
    setMeOpen(!meOpen);
  };

  const meMenu = (placement: "top" | "bottom") =>
    meOpen ? (
      <GamePanel
        className={`absolute right-0 z-50 w-52 p-1.5 ${
          placement === "top" ? "top-full mt-1" : "bottom-full mb-1"
        }`}
      >
        <div className="flex flex-col gap-1">
          <button type="button" className={meItem} onClick={() => { setMeOpen(false); openAvatar(); }}>
            Edit avatar
          </button>
          {isGuest ? (
            <button
              type="button"
              className={meItem}
              onClick={() => {
                setMeOpen(false);
                setSavePanel("save");
              }}
            >
              Save your dorm
            </button>
          ) : (
            <div className="flex items-center justify-between px-2 py-1 font-body text-xs font-bold text-panel-foreground">
              <span>@{auth.handle ?? "…"}</span>
              <span className="flex items-center gap-1 text-panel-muted" title={`Sync: ${syncState.status}`}>
                {syncIcon}
                <span className="text-[10px]">{syncState.status}</span>
              </span>
            </div>
          )}
          {isGuest ? (
            <button
              type="button"
              className={meItem}
              onClick={() => {
                setMeOpen(false);
                setSavePanel("signin");
              }}
            >
              Sign in
            </button>
          ) : signOutConfirm ? (
            <div className="rounded-[3px] border-2 border-ink bg-panel-foreground/5 p-2">
              <p className="mb-1.5 font-body text-[11px] leading-snug text-panel-muted">
                This device will start a fresh guest dorm; yours stays saved.
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="flex-1 rounded-[3px] border-2 border-ink bg-destructive px-2 py-1 font-display text-[11px] font-bold text-destructive-foreground"
                  onClick={() => void signOutToGuest()}
                >
                  Sign out
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-[3px] border-2 border-ink bg-panel px-2 py-1 font-display text-[11px] font-bold text-panel-foreground"
                  onClick={() => setSignOutConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={meItem} onClick={() => setSignOutConfirm(true)}>
              Sign out
            </button>
          )}
          <button
            type="button"
            className={meItem}
            onClick={() => {
              setMeOpen(false);
              setFeedbackOpen(true);
            }}
          >
            Send feedback
          </button>
        </div>
      </GamePanel>
    ) : null;

  const guestDot = isGuest ? (
    <span
      aria-label="Guest — save your dorm"
      className="pointer-events-none absolute -right-1 -top-1 size-3 rounded-full border-2 border-ink bg-primary"
    />
  ) : null;

  useEffect(() => {
    hydratePlayerState();
    hydrateDevMode();
    hydrateTimeOverride();
    setHydrated(true);
    // guest-first accounts: silent anonymous session, then cloud-save sync
    void initAuth();
    startSaveSync();
  }, []);

  // live avatar / room mood / name in the world
  useEffect(() => {
    sceneRef.current?.applyAvatar();
  }, [avatar]);
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    sc.applyMyMood();
    setItemThumbs(buildItemThumbs(sc, myMood, getPlayerState().roomLayout));
  }, [myMood]);
  // recolors show up in tray + shop thumbnails
  useEffect(() => {
    const sc = sceneRef.current;
    if (sc) setItemThumbs(buildItemThumbs(sc, getPlayerState().myMood, getPlayerState().roomLayout));
  }, [tintKey]);
  // floors repaint with a quick stepped sweep; the door redraws live
  useEffect(() => {
    sceneRef.current?.applyMyFloor(true);
  }, [myFloorId]);
  useEffect(() => {
    sceneRef.current?.applyMyDoor();
  }, [door]);
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
        getMyFloorId: () => getPlayerState().myFloorId,
        getDoor: () => getPlayerState().door,
        onRecolor: (index: number, tint: number | null) => playerActions.recolorPlaced(index, tint),
        canAfford: (price: number) => canAfford(price),
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
          setItemThumbs(buildItemThumbs(scene, getPlayerState().myMood, getPlayerState().roomLayout));
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
      if (trayTab === "door") sceneRef.current?.frameMyDoor(inset);
      else sceneRef.current?.frameMyRoom(inset);
    };
    const raf = requestAnimationFrame(frame);
    window.addEventListener("resize", frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", frame);
    };
  }, [editing, wallpaperOpen, trayTab]);

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
  };

  /** shop thumbnails: room items as tinted in your room, outfits on your own avatar */
  const shopThumbs = useMemo(() => ({ ...itemThumbs, ...outfitThumbs(avatar) }), [itemThumbs, avatar]);

  const toggleEdit = (on: boolean) => {
    setEditing(on);
    setTrayTab("furniture");
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
            <div className="game-panel pointer-events-auto flex items-stretch gap-1 px-1.5 py-1.5">
              {/* coin count is the dock's only text; the phase glyph rides its corner */}
              <div className="relative flex flex-[1.4] items-center justify-center gap-1">
                <Coins className="size-3.5 text-panel-foreground" aria-hidden />
                <span className="font-body text-sm font-bold text-panel-foreground">
                  <CoinAmount value={coins} unlimited={devMode.enabled && devMode.unlimited} />
                </span>
                {phase ? (
                  <span className="absolute -top-2 right-0" title={PHASE_LABEL[phase]}>
                    <PixelIcon def={PHASE_GLYPHS[phase]} size={12} />
                  </span>
                ) : null}
              </div>
              {packageReady ? (
                <div
                  className="relative flex flex-1 items-center justify-center"
                  title="A package is waiting in the mail cubby"
                >
                  <IconChip>
                    <Mail className="size-3.5" aria-hidden />
                  </IconChip>
                  {mailDot}
                </div>
              ) : null}
              <div className="relative flex-1">
                <button
                  type="button"
                  aria-label="Shop"
                  onClick={openShop}
                  className="flex w-full items-center justify-center rounded-[3px] py-0.5"
                >
                  <IconChip>
                    <Store className="size-3.5" aria-hidden />
                  </IconChip>
                </button>
                {shopDot}
              </div>
              {inMyRoom && !editing ? (
                <button
                  type="button"
                  aria-label="Edit My Room"
                  onClick={() => {
                    sfx.uiClick();
                    toggleEdit(true);
                  }}
                  className="flex flex-1 items-center justify-center rounded-[3px] py-0.5"
                >
                  <IconChip>
                    <Pencil className="size-3.5" aria-hidden />
                  </IconChip>
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Edit your avatar"
                onClick={openAvatar}
                className="flex flex-1 items-center justify-center rounded-[3px] py-0.5"
              >
                <IconChip>
                  <UserRound className="size-3.5" aria-hidden />
                </IconChip>
              </button>
              <button
                type="button"
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                aria-pressed={muted}
                onClick={() => playerActions.toggleMute()}
                className="flex flex-1 items-center justify-center rounded-[3px] py-0.5"
              >
                <IconChip>{soundIcon}</IconChip>
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* one slim top bar: logo, coins, phase, mail, streak, help — Shop / Edit / Me / sound */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 [&>*]:pointer-events-auto">
              <GamePanel accent="#7f9c86" className="px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={onTitleTap}
                  className="block font-display text-xs font-bold tracking-wide text-panel-foreground"
                >
                  Floor 3
                </button>
              </GamePanel>
              <GamePanel className="flex items-center gap-2 px-2.5 py-1.5">
                <IconChip>
                  <Coins className="size-3.5" aria-hidden />
                </IconChip>
                <span className="font-body text-sm font-bold text-panel-foreground">
                  <CoinAmount value={coins} unlimited={devMode.enabled && devMode.unlimited} />
                </span>
              </GamePanel>
              <PhaseChip />
              {packageReady ? (
                <GamePanel
                  className="relative flex items-center gap-1.5 px-2 py-1.5"
                  accent="#c99a5b"
                  title="A package is waiting in the mail cubby"
                >
                  <IconChip>
                    <Mail className="size-3.5" aria-hidden />
                  </IconChip>
                  <span className="font-body text-xs font-bold text-panel-foreground">Mail</span>
                  {mailDot}
                </GamePanel>
              ) : null}
              {currentStreak > 0 ? (
                <GamePanel
                  className="flex items-center gap-2 px-2.5 py-1.5"
                  accent="#c8765c"
                  title={`${currentStreak}-day daily question streak`}
                >
                  <IconChip>
                    <Flame className="size-3.5" aria-hidden />
                  </IconChip>
                  <span className="font-body text-sm font-bold tabular-nums text-panel-foreground">{currentStreak}</span>
                </GamePanel>
              ) : null}
              <button
                type="button"
                aria-label="Controls help"
                aria-expanded={showHint}
                onClick={() => {
                  sfx.uiClick();
                  setHintOpen(!showHint);
                }}
                className="rounded-[3px]"
              >
                <IconChip>
                  <CircleHelp className="size-3.5" aria-hidden />
                </IconChip>
              </button>
            </div>
            <div className="flex items-center gap-1.5 [&>*]:pointer-events-auto">
              <div className="relative">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
                  onClick={openShop}
                >
                  <IconChip>
                    <Store className="size-3.5" aria-hidden />
                  </IconChip>
                  Shop
                </Button>
                {shopDot}
              </div>
              {inMyRoom && !editing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
                  onClick={() => {
                    sfx.uiClick();
                    toggleEdit(true);
                  }}
                >
                  <IconChip>
                    <Pencil className="size-3.5" aria-hidden />
                  </IconChip>
                  Edit My Room
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                aria-label="Edit your avatar"
                className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
                onClick={openAvatar}
              >
                <IconChip>
                  <UserRound className="size-3.5" aria-hidden />
                </IconChip>
                Me
              </Button>
              <button
                type="button"
                aria-label={muted ? "Unmute sound" : "Mute sound"}
                aria-pressed={muted}
                onClick={() => playerActions.toggleMute()}
                className="rounded-[3px]"
              >
                <IconChip>{soundIcon}</IconChip>
              </button>
            </div>
          </div>
          {showHint ? (
            <GamePanel className="absolute left-3 top-14 z-30 max-w-60 px-3 py-2">
              <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                {isTouch ? "Tap anywhere to walk" : "WASD / arrows or click a tile to walk"}
              </p>
              <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                {isTouch ? "Walk up to things, then tap to open" : "Wander up to things — they open on their own"}
              </p>
            </GamePanel>
          ) : null}
        </>
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
            onTabChange={(tab) => {
              if (tab === "door") sceneRef.current?.cancelPlacing();
              setTrayTab(tab);
            }}
            placingItemId={placingItemId}
            thumbnails={thumbs}
            itemThumbnails={itemThumbs}
          />
        </div>
      ) : moveIn ? null : (
        popupLayer
      )}

      <WelcomeQuests hidden={editing || moveIn || !onboarded} docked={isPhone} collapsed={overlayOpen} />

      {knockSpot && !editing && !moveIn ? (
        <div
          className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center ${
            isPhone ? "bottom-[calc(8.25rem+env(safe-area-inset-bottom))]" : "bottom-5"
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
        getThumb={(itemId, tint) => {
          const sc = sceneRef.current;
          const item = ITEM_CATALOG[itemId];
          return sc && item ? buildItemThumb(sc, item, getPlayerState().myMood, tint) : null;
        }}
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
