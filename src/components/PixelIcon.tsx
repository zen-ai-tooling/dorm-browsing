/** shared string-grid pixel icon renderer (stickers, shop tabs, shopkeeper) */
export interface PixelGlyph {
  icon: string[];
  color: string;
  color2: string;
}

/** 12×12 string-grid pixel icon rendered as SVG rects */
export const PixelIcon = ({ def, size = 24 }: { def: PixelGlyph; size?: number }) => {
  const fill: Record<string, string> = {
    X: "var(--color-ink)",
    o: def.color,
    a: def.color2,
    "+": "var(--polaroid)",
  };
  return (
    <svg
      viewBox={`0 0 ${def.icon[0]?.length ?? 12} ${def.icon.length}`}
      width={size * ((def.icon[0]?.length ?? 12) / 12)}
      height={size * (def.icon.length / 12)}
      shapeRendering="crispEdges"
      aria-hidden
      className="shrink-0"
    >
      {def.icon.flatMap((row, y) =>
        Array.from(row).map((ch, x) =>
          fill[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} /> : null,
        ),
      )}
    </svg>
  );
};

