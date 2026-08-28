import { useEffect, useRef, useState } from "react";
import { Coins, Pencil, Store } from "lucide-react";
import type { PopupPayload } from "@/data/dorm";
import { ITEM_CATALOG } from "@/data/items";
import { Button } from "@/components/ui/button";
import { DormPopup } from "./DormPopup";
import { RoomEditorTray } from "./RoomEditorTray";
import { ShopPanel } from "./ShopPanel";
import { getPlayerState, hydratePlayerState, playerActions, usePlayerState } from "@/lib/playerStore";
import type { DormScene } from "@/game/DormScene";

const DormGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DormScene | null>(null);
  const [popup, setPopup] = useState<PopupPayload | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inMyRoom, setInMyRoom] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const { coins } = usePlayerState();

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
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-secondary">
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
        <div className="rounded-2xl bg-card/85 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-md backdrop-blur-sm">
          <p className="font-bold tracking-wide text-foreground">Dorm Vibes · Floor 3</p>
          <p>WASD / arrows or click a tile to walk</p>
          <p>Wander up to things — they open on their own</p>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-2xl bg-card/85 px-3 py-1.5 text-xs font-bold text-foreground shadow-md backdrop-blur-sm">
            <Coins className="size-4 text-primary" aria-hidden /> {coins}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setShopOpen(true)}>
            <Store className="size-4" aria-hidden /> Shop
          </Button>
          {inMyRoom || editing ? (
            <Button size="sm" variant={editing ? "default" : "secondary"} onClick={() => toggleEdit(!editing)}>
              <Pencil className="size-4" aria-hidden /> {editing ? "Exit edit" : "Edit My Room"}
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
