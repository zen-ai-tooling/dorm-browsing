import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getAuth, onUserChange } from "./auth";

export interface QueuedFeedback {
  id: string;
  user_id: string | null;
  kind: string;
  note: string;
  context: Json;
}
const KEY = "dorm-vibes-feedback-queue";
export const FEEDBACK_QUEUE_LIMIT = 20;
export const appendFeedback = (queue: readonly QueuedFeedback[], entry: QueuedFeedback) =>
  queue.length >= FEEDBACK_QUEUE_LIMIT ? null : [...queue, entry];

const read = (): QueuedFeedback[] => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((row): row is QueuedFeedback => !!row && typeof row.id === "string" &&
      typeof row.note === "string" && typeof row.kind === "string" &&
      (row.user_id === null || typeof row.user_id === "string")).slice(0, FEEDBACK_QUEUE_LIMIT);
  } catch { return []; }
};
const write = (queue: QueuedFeedback[]) => window.localStorage.setItem(KEY, JSON.stringify(queue));
let flushing: Promise<void> | null = null;

export const flushFeedbackQueue = (): Promise<void> => {
  if (flushing) return flushing;
  const uid = getAuth().userId;
  if (!uid || (typeof navigator !== "undefined" && !navigator.onLine)) return Promise.resolve();
  const work = async () => {
    for (const entry of read()) {
      // Never submit somebody else's queued note as the current account.
      if (entry.user_id && entry.user_id !== uid) continue;
      if (getAuth().userId !== uid) return;
      const { error } = await supabase.from("feedback").upsert({ ...entry, user_id: uid }, { onConflict: "id", ignoreDuplicates: true });
      if (error) return;
      write(read().filter((row) => row.id !== entry.id));
    }
  };
  flushing = work().catch(() => {}).finally(() => { flushing = null; });
  return flushing;
};

export const submitFeedback = async (input: Omit<QueuedFeedback, "id" | "user_id">): Promise<"sent" | "queued" | "full" | "unavailable"> => {
  const entry = { ...input, id: crypto.randomUUID(), user_id: getAuth().userId };
  const queue = appendFeedback(read(), entry);
  if (!queue) return "full";
  try { write(queue); } catch { return "unavailable"; }
  await flushFeedbackQueue();
  return read().some((row) => row.id === entry.id) ? "queued" : "sent";
};

let started = false;
export const startFeedbackQueue = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => { void flushFeedbackQueue(); });
  onUserChange(() => { void flushFeedbackQueue(); });
  void flushFeedbackQueue();
};