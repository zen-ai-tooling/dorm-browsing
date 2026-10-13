import { useEffect, useRef, useState } from "react";
import { Coins, Flame, Pencil, Store, Volume2, VolumeX } from "lucide-react";
import type { PopupPayload } from "@/data/dorm";
import { featuredForToday, ITEM_CATALOG, zoomTextureKey } from "@/data/items";
import { Button } from "@/components/ui/button";
import { DormPopup } from "./DormPopup";
import { GamePanel, IconChip } from "./GamePanel";
import { RoomEditorTray } from "./RoomEditorTray";
import { WallpaperPicker } from "./WallpaperPicker";
import { ShopPanel } from "./ShopPanel";
import { todayKey } from "@/data/prompts";
import { getPlayerState, hydratePlayerState, playerActions, usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import type { DormScene } from "@/game/DormScene";

const DormGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DormScene | null>(null);
  const [popup, setPopup] = useState<PopupPayload | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inMyRoom, setInMyRoom] = useState(false);
  const [placingItemId, setPlacingItemId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const { coins, muted, currentStreak, lastShopSeenDate, myWallpaperId, seenControls } =
    usePlayerState();
  const [hintOpen, setHintOpen] = useState<boolean | null>(null);
  const showHint = hintOpen ?? !seenControls;
  const trayWrapRef = useRef<HTMLDivElement>(null);
  const hasNewFeatured = featuredForToday().length > 0 && lastShopSeenDate !== todayKey();


  useEffect(() => {
    hydratePlayerState();
  }, []);

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
        onReady: (scene: DormScene) => {
          sceneRef.current = scene;

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
        },
      });
    })();

    return () => {
      destroyed = true;
      sceneRef.current = null;
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

  // Escape backs out of placing mode / selection even when the canvas isn't focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") sceneRef.current?.escape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleEdit = (on: boolean) => {
    setEditing(on);
    if (!on) setWallpaperOpen(false);
    sceneRef.current?.setEditMode(on);
    if (!on) sceneRef.current?.restoreCamera();
  };


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

      <div className="pointer-events-none absolute left-4 top-4 space-y-2">
        <GamePanel accent="#7f9c86" className="pointer-events-auto px-3 py-2">
          <button
            type="button"
            aria-expanded={showHint}
            onClick={() => setHintOpen(!showHint)}
            className="block text-left font-display text-sm font-bold tracking-wide text-panel-foreground"
          >
            Dorm Vibes · Floor 3
          </button>
          {showHint ? (
            <>
              <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                WASD / arrows or click a tile to walk
              </p>
              <p className="font-body text-[11px] leading-relaxed text-panel-muted">
                Wander up to things — they open on their own
              </p>
            </>
          ) : null}
        </GamePanel>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <GamePanel className="flex items-center gap-2 px-2.5 py-1.5">
            <IconChip>
              <Coins className="size-3.5" aria-hidden />
            </IconChip>
            <span className="font-body text-sm font-bold tabular-nums text-panel-foreground">
              {coins}
            </span>
          </GamePanel>
          {currentStreak > 0 ? (
            <GamePanel
              className="flex items-center gap-2 px-2.5 py-1.5"
              accent="#c8765c"
              title={`${currentStreak}-day daily question streak`}
            >
              <IconChip>
                <Flame className="size-3.5" aria-hidden />
              </IconChip>
              <span className="font-body text-sm font-bold tabular-nums text-panel-foreground">
                {currentStreak}
              </span>
            </GamePanel>
          ) : null}
          <button
            type="button"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={muted}
            onClick={() => playerActions.toggleMute()}
            className="rounded-[3px]"
          >
            <IconChip>
              {muted ? (
                <VolumeX className="size-3.5" aria-hidden />
              ) : (
                <Volume2 className="size-3.5" aria-hidden />
              )}
            </IconChip>
          </button>
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
              onClick={() => {
                sfx.uiClick();
                playerActions.markShopSeen();
                setShopOpen(true);
              }}
            >
              <IconChip>
                <Store className="size-3.5" aria-hidden />
              </IconChip>
              Shop
            </Button>
            {hasNewFeatured ? (
              <span
                aria-label="New featured items in the shop"
                className="pointer-events-none absolute -right-1 -top-1 size-3 rounded-full border-2 border-ink bg-primary"
              />
            ) : null}
          </div>
          {inMyRoom && !editing ? (
            <Button
              size="sm"
              variant={editing ? "default" : "secondary"}
              className={`rounded-[3px] border-2 border-ink font-display font-bold ${
                editing ? "" : "bg-panel text-panel-foreground hover:bg-panel/80"
              }`}
              onClick={() => {
                sfx.uiClick();
                toggleEdit(!editing);
              }}
            >
              <IconChip>
                <Pencil className="size-3.5" aria-hidden />
              </IconChip>
              {editing ? "Exit edit" : "Edit My Room"}
            </Button>
          ) : null}
        </div>
      </div>

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
        />
        </div>
      ) : (
        <DormPopup payload={popup} thumbnails={thumbs} />
      )}

      <ShopPanel open={shopOpen} onOpenChange={setShopOpen} thumbnails={thumbs} />
    </div>
  );
};

export default DormGame;
