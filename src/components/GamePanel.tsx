import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared chunky in-world panel: solid parchment fill, ink border, notched corners. */
export const GamePanel = ({
  accent,
  className,
  children,
}: {
  accent?: string | undefined;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn("game-panel relative overflow-hidden", className)}>
    {accent ? (
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-2"
        style={{ backgroundColor: accent }}
      />
    ) : null}
    <div className={accent ? "pl-2" : undefined}>{children}</div>
  </div>
);

/** Ink-outlined square chip behind a lucide icon so it reads as a game object. */
export const IconChip = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <span className={cn("icon-chip", className)}>{children}</span>;
