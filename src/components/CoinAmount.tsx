/** Coin balance readout: the number, or ∞ + a tiny DEV tag while dev unlimited coins is on. */
export const CoinAmount = ({ value, unlimited }: { value: number; unlimited: boolean }) =>
  unlimited ? (
    <span className="inline-flex items-center gap-1" aria-label="Unlimited coins (dev mode)">
      <span className="font-body leading-none">∞</span>
      <span className="rounded-[2px] border border-ink bg-primary px-1 font-display text-[9px] font-bold leading-[12px] text-primary-foreground">
        DEV
      </span>
    </span>
  ) : (
    <span className="font-body tabular-nums">{value}</span>
  );
