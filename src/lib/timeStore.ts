import { useEffect, useState, useSyncExternalStore } from "react";
import { isPhase, phaseForHour, type Phase } from "@/game/timeOfDay";

// Dev-only time-of-day override. Session only (never saved), so nobody gets stuck at night.
let override: Phase | null = null;
/** dev clock: a fixed local hour (0–23) that drives residents AND the lighting phase */
let hourOverride: number | null = null;
/** bumps on every change so React re-renders */
let version = 0;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const setTimeOverride = (p: Phase | null) => {
  override = p;
  if (p !== null) hourOverride = null;
  emit();
};
export const getTimeOverride = () => override;

/** dev hour slider; null = Auto (real clock). Clears the phase-only override so they stay in sync. */
export const setHourOverride = (h: number | null) => {
  hourOverride = h === null ? null : ((Math.round(h) % 24) + 24) % 24;
  override = null;
  emit();
};
export const getHourOverride = () => hourOverride;

/** the local hour the world runs on right now */
export const currentHour = (now: Date = new Date()): number => hourOverride ?? now.getHours();

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
export const currentPhase = (now: Date = new Date()): Phase => override ?? phaseForHour(currentHour(now));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useTimeOverride = () => useSyncExternalStore(subscribe, getTimeOverride, () => null);
/** changes whenever either override changes */
export const useTimeVersion = () => useSyncExternalStore(subscribe, () => version, () => 0);
export const useHourOverride = () => useSyncExternalStore(subscribe, getHourOverride, () => null);

/** current phase for the HUD; null until mounted (no SSR guess), re-checked every minute */
export const usePhase = (): Phase | null => {
  const o = useTimeOverride();
  useTimeVersion();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return null;
  return o ?? phaseForHour(currentHour(now));
};
