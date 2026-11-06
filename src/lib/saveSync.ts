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

let userId: string | null = null;
let timer: number | undefined;
let retryTimer: number | undefined;
let retryDelay = 5000;
let dirty = false;

const fetchCloudSave = async (uid: string) => {
  const { data, error } = await supabase
    .from("player_saves")
    .select("state, updated_at")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const upload = async () => {
  if (!userId) return;
  const state = getPlayerState();
  const { error } = await supabase.from("player_saves").upsert({
    user_id: userId,
    state: JSON.parse(JSON.stringify(state)),
    save_version: 1,
    updated_at: new Date(state.savedAt).toISOString(),
    device_label: deviceLabel(),
  });
  if (error) throw error;
  dirty = false;
  retryDelay = 5000;
  write({ status: "synced" });
};

const scheduleRetry = () => {
  write({ status: "offline" });
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void flush(), retryDelay);
  retryDelay = Math.min(retryDelay * 3, 60_000);
};

const flush = async () => {
  window.clearTimeout(timer);
  timer = undefined;
  if (!dirty || !userId) return;
  try {
    await upload();
  } catch {
    scheduleRetry();
  }
};

const scheduleSave = () => {
  if (!userId) return;
  dirty = true;
  write({ status: "saving" });
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void flush(), 2000);
};

/** boot merge for a (new) session: newer cloud save wins, otherwise local uploads */
const boot = async (uid: string) => {
  userId = uid;
  try {
    const row = await fetchCloudSave(uid);
    const local = getPlayerState();
    if (row && new Date(row.updated_at).getTime() > local.savedAt) {
      applyPlayerState(normalizeSave(row.state));
    } else {
      dirty = true;
      await flush();
    }
    write({ status: "synced" });
  } catch {
    scheduleRetry();
  }
};

let started = false;

export const startSaveSync = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  subscribePlayerState(() => {
    if (userId && !sync.conflict) scheduleSave();
  });

  window.addEventListener("online", () => {
    retryDelay = 5000;
    void flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });

  onUserChange((uid, prev) => {
    const local = getPlayerState();
    // account switch with real progress on this device → the player picks which dorm wins
    if (prev && prev !== uid && hasRealProgress(local)) {
      userId = uid;
      void (async () => {
        try {
          const row = await fetchCloudSave(uid);
          if (row) {
            write({ conflict: { cloudState: normalizeSave(row.state), cloudUpdatedAt: row.updated_at } });
            return;
          }
          dirty = true;
          await flush();
        } catch {
          scheduleRetry();
        }
      })();
      return;
    }
    void boot(uid);
  });
};

/** conflict dialog: "Keep my saved dorm" */
export const keepCloudSave = () => {
  if (!sync.conflict) return;
  applyPlayerState(sync.conflict.cloudState);
  write({ conflict: null, status: "synced" });
};

/** conflict dialog: "Keep this device's dorm" — overwrites the cloud row */
export const keepLocalSave = () => {
  if (!sync.conflict) return;
  write({ conflict: null });
  dirty = true;
  void flush();
};

/** dev "Reset everything" also wipes the cloud row so the new-player flow reruns */
export const deleteCloudSave = async () => {
  if (!userId) return;
  try {
    await supabase.from("player_saves").delete().eq("user_id", userId);
  } catch {
    /* offline — local reset still happens */
  }
};
