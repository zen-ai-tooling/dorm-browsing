import { useEffect, useState, useSyncExternalStore } from "react";
import { isPhase, phaseFor, type Phase } from "@/game/timeOfDay";

// Dev-only time-of-day override. Session only (never saved), so nobody gets stuck at night.
let override: Phase | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const setTimeOverride = (p: Phase | null) => {
  override = p;
  emit();
};
export const getTimeOverride = () => override;

/** reads `?time=night` (morning/day/golden/night/auto) and strips it, like `?dev=1` */
export const hydrateTimeOverride = () => {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const url = new URL(window.location.href);
  const param = url.searchParams.get("time");
  if (param === null) return;
  if (isPhase(param)) override = param;
  else if (param === "auto") override = null;
  url.searchParams.delete("time");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  emit();
};

/** the phase the world should show right now */
export const currentPhase = (now: Date = new Date()): Phase => override ?? phaseFor(now);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useTimeOverride = () => useSyncExternalStore(subscribe, getTimeOverride, () => null);

/** current phase for the HUD; null until mounted (no SSR guess), re-checked every minute */
export const usePhase = (): Phase | null => {
  const o = useTimeOverride();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return null;
  return o ?? phaseFor(now);
};
