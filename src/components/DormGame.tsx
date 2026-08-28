import { useEffect, useRef, useState } from "react";
import { Coins, Pencil, Store, Volume2, VolumeX } from "lucide-react";
import type { PopupPayload } from "@/data/dorm";
import { ITEM_CATALOG } from "@/data/items";
import { Button } from "@/components/ui/button";
import { DormPopup } from "./DormPopup";
import { GamePanel, IconChip } from "./GamePanel";
import { RoomEditorTray } from "./RoomEditorTray";
import { ShopPanel } from "./ShopPanel";
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
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const { coins, muted } = usePlayerState();

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
        onReady: (scene: DormScene) => {
          sceneRef.current = scene;
          (window as unknown as { __scene?: DormScene }).__scene = scene;
          const map: Record<string, string> = {};
          for (const item of Object.values(ITEM_CATALOG)) {
            if (map[item.textureKey]) continue;
            const url = scene.getTextureDataUrl(item.textureKey);
            if (url) map[item.textureKey] = url;
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

  const toggleEdit = (on: boolean) => {
    setEditing(on);
    sceneRef.current?.setEditMode(on);
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
        <GamePanel accent="#7f9c86" className="px-3 py-2">
          <p className="font-display text-sm font-bold tracking-wide text-panel-foreground">
            Dorm Vibes · Floor 3
          </p>
          <p className="font-body text-[11px] leading-relaxed text-panel-muted">
            WASD / arrows or click a tile to walk
          </p>
          <p className="font-body text-[11px] leading-relaxed text-panel-muted">
            Wander up to things — they open on their own
          </p>
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
          <Button
            size="sm"
            variant="secondary"
            className="rounded-[3px] border-2 border-ink bg-panel font-display font-bold text-panel-foreground hover:bg-panel/80"
            onClick={() => {
              sfx.uiClick();
              setShopOpen(true);
            }}
          >
            <IconChip>
              <Store className="size-3.5" aria-hidden />
            </IconChip>
            Shop
          </Button>
          {inMyRoom || editing ? (
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

      {editing ? (
        <RoomEditorTray
          onDone={() => toggleEdit(false)}
          onTrayClick={(itemId) => sceneRef.current?.placeFromTray(itemId)}
          thumbnails={thumbs}
        />
      ) : (
        <DormPopup payload={popup} />
      )}

      <ShopPanel open={shopOpen} onOpenChange={setShopOpen} thumbnails={thumbs} />
    </div>
  );
};

export default DormGame;
