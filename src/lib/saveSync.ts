import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { onUserChange } from "@/lib/auth";
import {
  applyPlayerState,
  getPlayerState,
  hasRealProgress,
  normalizeSave,
  subscribePlayerState,
  type PlayerState,
} from "@/lib/playerStore";

/**
 * Cloud saves (Iteration 27): localStorage stays the instant-play source; the cloud
 * row follows it. Boot merges by timestamp, changes upload on a 2s debounce, and
 * offline play just retries later — the game never blocks on the network.
 */

export type SyncStatus = "synced" | "saving" | "offline";

export interface CloudConflict {
  cloudState: PlayerState;
  cloudUpdatedAt: string;
}

interface SyncState {
  status: SyncStatus;
  /** signing into an existing account while this device has real progress */
  conflict: CloudConflict | null;
}

let sync: SyncState = { status: "synced", conflict: null };
const listeners = new Set<() => void>();

const write = (next: Partial<SyncState>) => {
  sync = { ...sync, ...next };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSaveSync = () => useSyncExternalStore(subscribe, () => sync, () => sync);

const deviceLabel = (): string => {
  if (typeof navigator === "undefined") return "";
  const touch = navigator.maxTouchPoints > 0 ? "Touch" : "Desktop";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua) && !/Chrome\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Browser";
  return `${touch} · ${browser}`;
};

export interface BootInput {
  uid: string;
  localOwner: string | null;
  local: PlayerState;
  cloud: { state: unknown; updated_at: string } | null;
}

/** Timestamps only mean anything within the same account. */
export const decideBoot = ({ uid, localOwner, local, cloud }: BootInput): "useCloud" | "uploadLocal" | "conflict" => {
  if (!cloud) return "uploadLocal";
  if (localOwner === uid)
    return new Date(cloud.updated_at).getTime() > local.savedAt ? "useCloud" : "uploadLocal";
  return hasRealProgress(local) ? "conflict" : "useCloud";
};

const OWNER_KEY = "dorm-vibes-save-owner";
let owner: string | null = null;
const readOwner = () => {
  try { owner = window.localStorage.getItem(OWNER_KEY); } catch { /* device storage unavailable */ }
  return owner;
};
const setOwner = (uid: string) => {
  owner = uid;
  try { window.localStorage.setItem(OWNER_KEY, uid); } catch { /* keep in memory */ }
};

let userId: string | null = null;
let timer: number | undefined;
let retryTimer: number | undefined;
let retryDelay = 5000;
let dirty = false;
let stopped = false;
let epoch = 0;
let booting: { uid: string; promise: Promise<void> } | null = null;
let bootReady = false;
let uploading: Promise<void> | null = null;

const fetchCloudSave = async (uid: string) => {
  const { data, error } = await supabase.from("player_saves").select("state, updated_at").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data;
};

const scheduleRetry = () => {
  if (stopped) return;
  write({ status: "offline" });
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    if (!bootReady && userId && !sync.conflict) void boot(userId);
    else void flush().catch(scheduleRetry);
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 3, 60_000);
};

const flush = async (): Promise<void> => {
  window.clearTimeout(timer);
  timer = undefined;
  if (uploading) await uploading;
  if (stopped || !dirty || !userId || !bootReady || sync.conflict) return;
  const uid = userId;
  const generation = epoch;
  const state = getPlayerState();
  dirty = false;
  const work = async () => {
    const { error } = await supabase.from("player_saves").upsert({
      user_id: uid,
      state: JSON.parse(JSON.stringify(state)),
      save_version: 1,
      updated_at: new Date(state.savedAt).toISOString(),
      device_label: deviceLabel(),
    });
    if (generation !== epoch || stopped) return;
    if (error) { dirty = true; throw error; }
    setOwner(uid);
    retryDelay = 5000;
    write({ status: dirty ? "saving" : "synced" });
  };
  uploading = work();
  try { await uploading; } finally { uploading = null; }
};

/** Sign-out must not discard changes still waiting for the debounce. */
export const flushNow = async () => {
  if (booting) await booting.promise;
  await flush();
  if (dirty && !sync.conflict && !stopped) await flush();
  if (sync.conflict || (!bootReady && userId)) throw new Error("Save is not ready");
};

const scheduleSave = () => {
  if (stopped || !userId || sync.conflict) return;
  dirty = true;
  write({ status: "saving" });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void flush().catch(scheduleRetry), 2000);
};

/** One ownership-aware path for both live sign-in and redirect reloads. */
const boot = (uid: string): Promise<void> => {
  if (stopped) return Promise.resolve();
  if (booting?.uid === uid) return booting.promise;
  window.clearTimeout(timer);
  window.clearTimeout(retryTimer);
  userId = uid;
  bootReady = false;
  dirty = false;
  write({ conflict: null });
  const generation = ++epoch;
  const promise = (async () => {
    try {
      if (uploading) await uploading.catch(() => {});
      const row = await fetchCloudSave(uid);
      if (stopped || generation !== epoch) return;
      const decision = decideBoot({ uid, localOwner: readOwner(), local: getPlayerState(), cloud: row });
      if (decision === "conflict" && row) {
        write({ conflict: { cloudState: normalizeSave(row.state), cloudUpdatedAt: row.updated_at }, status: "synced" });
        return;
      }
      if (decision === "useCloud" && row) {
        setOwner(uid);
        applyPlayerState(normalizeSave(row.state));
        dirty = false;
        bootReady = true;
        write({ status: "synced" });
      } else {
        bootReady = true;
        dirty = true;
        await flush();
      }
    } catch { if (generation === epoch) scheduleRetry(); }
  })();
  booting = { uid, promise };
  void promise.finally(() => { if (booting?.promise === promise) booting = null; });
  return promise;
};

let started = false;
export const startSaveSync = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  subscribePlayerState(scheduleSave);
  window.addEventListener("online", () => {
    retryDelay = 5000;
    if (!bootReady && userId && !sync.conflict) void boot(userId);
    else void flush().catch(scheduleRetry);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush().catch(scheduleRetry);
  });
  onUserChange((uid) => { void boot(uid); });
};

export const keepCloudSave = () => {
  if (!sync.conflict || !userId || stopped) return;
  setOwner(userId);
  applyPlayerState(sync.conflict.cloudState);
  dirty = false;
  bootReady = true;
  write({ conflict: null, status: "synced" });
};
export const keepLocalSave = () => {
  if (!sync.conflict || stopped) return;
  write({ conflict: null });
  bootReady = true;
  dirty = true;
  void flush().catch(scheduleRetry);
};

/** Drain requests already sent before deleting; no new flush may resurrect the row. */
export const stopSync = async () => {
  stopped = true;
  ++epoch;
  window.clearTimeout(timer);
  window.clearTimeout(retryTimer);
  dirty = false;
  if (uploading) await uploading.catch(() => {});
};
export const deleteCloudSave = async () => {
  await stopSync();
  if (!userId) return;
  const { error } = await supabase.from("player_saves").delete().eq("user_id", userId);
  if (error) throw error;
};
