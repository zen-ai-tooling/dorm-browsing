import { useEffect, useRef, useState } from "react";
import type { PopupPayload } from "@/data/dorm";
import { DormPopup } from "./DormPopup";

const DormGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<PopupPayload | null>(null);

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = await import("phaser");
      const { DormScene } = await import("@/game/DormScene");
      if (destroyed || !containerRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: "#e9eef2",
        pixelArt: false,
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [DormScene],
      });
      game.scene.start("dorm", { onPopup: (p: PopupPayload | null) => setPopup(p) });
      (window as unknown as { __dormGame?: unknown }).__dormGame = game;
    })();

    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-secondary">
      <div ref={containerRef} className="h-full w-full touch-none [&>canvas]:block" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-card/85 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-md backdrop-blur-sm">
        <p className="font-bold tracking-wide text-foreground">Dorm Vibes · Floor 3</p>
        <p>WASD / arrows or click a tile to walk</p>
        <p>Wander up to things — they open on their own</p>
      </div>
      <DormPopup payload={popup} />
    </div>
  );
};

export default DormGame;
