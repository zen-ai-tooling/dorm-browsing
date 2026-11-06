import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { clearLocalSave } from "@/lib/playerStore";

/**
 * Guest-first auth (Iteration 27): everyone gets a silent anonymous session on
 * load; "Save your dorm" links Google or an email code to that same account.
 * Client-only — never imported by server code.
 */

export interface AuthState {
  /** first session attempt finished (guest or returning) */
  ready: boolean;
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
  /** @handle from profiles, null until chosen */
  handle: string | null;
}

let auth: AuthState = { ready: false, userId: null, isAnonymous: true, email: null, handle: null };
const listeners = new Set<() => void>();
const userChangeListeners = new Set<(userId: string, previousUserId: string | null) => void>();

const write = (next: Partial<AuthState>) => {
  auth = { ...auth, ...next };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAuth = () => useSyncExternalStore(subscribe, () => auth, () => auth);
export const getAuth = () => auth;

/** saveSync registers here: fires when the signed-in user id changes (guest → real, account switch) */
export const onUserChange = (cb: (userId: string, previousUserId: string | null) => void) => {
  userChangeListeners.add(cb);
  return () => userChangeListeners.delete(cb);
};

const loadHandle = async (userId: string) => {
  const { data } = await supabase.from("profiles").select("handle").eq("user_id", userId).maybeSingle();
  write({ handle: data?.handle ?? null });
};

let started = false;

/** silent guest sign-in on first load; resolves once a session exists */
export const initAuth = async (): Promise<void> => {
  if (started || typeof window === "undefined") return;
  started = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    const prev = auth.userId;
    const userId = session?.user.id ?? null;
    write({
      ready: true,
      userId,
      isAnonymous: session?.user.is_anonymous ?? true,
      email: session?.user.email ?? null,
      handle: userId === prev ? auth.handle : null,
    });
    if (userId && userId !== prev) {
      void loadHandle(userId);
      userChangeListeners.forEach((cb) => cb(userId, prev));
    }
  });

  try {
    const { data } = await supabase.auth.getSession();
    let session = data.session;
    if (!session) {
      const { data: s, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // offline or backend down — play as a local guest, retry next load
        write({ ready: true });
        return;
      }
      session = s.session;
    }
    const userId = session?.user.id ?? null;
    write({
      ready: true,
      userId,
      isAnonymous: session?.user.is_anonymous ?? true,
      email: session?.user.email ?? null,
    });
    if (userId) {
      await loadHandle(userId);
      userChangeListeners.forEach((cb) => cb(userId, null));
    }
  } catch {
    write({ ready: true });
  }
};

export interface SignInResult {
  error?: string;
  /** browser navigated away to the provider */
  redirected?: boolean;
  /** the account now signed in is a DIFFERENT user than the guest — show the conflict dialog */
  switchedAccount?: boolean;
}

/** Continue with Google: links to the guest when free, else signs into the existing account */
export const continueWithGoogle = async (): Promise<SignInResult> => {
  const prevId = auth.userId;
  const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (result.error) return { error: result.error.message };
  if (result.redirected) return { redirected: true };
  const { data } = await supabase.auth.getSession();
  const newId = data.session?.user.id ?? null;
  return { switchedAccount: !!newId && !!prevId && newId !== prevId };
};

export type EmailFlow = "link" | "signin";

/**
 * Emails a 6-digit code. "link" (guest saving their dorm) tries updateUser first;
 * if that email already has an account it falls back to a sign-in code, which will
 * switch accounts on verify (→ conflict dialog).
 */
export const sendEmailCode = async (
  email: string,
  flow: EmailFlow,
): Promise<{ error?: string; flow: EmailFlow }> => {
  if (flow === "link") {
    const { error } = await supabase.auth.updateUser({ email });
    if (!error) return { flow: "link" };
    if (!/already|registered|in use/i.test(error.message)) return { error: error.message, flow };
    // email belongs to an existing account — sign into it instead
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: flow === "link" },
  });
  if (error) return { error: error.message, flow: "signin" };
  return { flow: "signin" };
};

export const verifyEmailCode = async (
  email: string,
  token: string,
  flow: EmailFlow,
): Promise<SignInResult> => {
  const prevId = auth.userId;
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: flow === "link" ? "email_change" : "email",
  });
  if (error) return { error: error.message };
  const { data } = await supabase.auth.getSession();
  const newId = data.session?.user.id ?? null;
  return { switchedAccount: !!newId && !!prevId && newId !== prevId };
};

// ---------- handles ----------

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export const handleAvailable = async (handle: string): Promise<boolean> => {
  if (!HANDLE_RE.test(handle)) return false;
  const { data, error } = await supabase.rpc("handle_available", { _handle: handle });
  if (error) return false;
  return data === true;
};

/** 3 suggestions from the player's name, first-fit */
export const handleSuggestions = (name: string): string[] => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16);
  if (base.length < 3) return [];
  const out = [base, `${base}_f3`, `${base}${Math.floor(10 + Math.random() * 89)}`];
  return Array.from(new Set(out)).filter((h) => HANDLE_RE.test(h)).slice(0, 3);
};

export const saveHandle = async (handle: string, displayName: string): Promise<{ error?: string }> => {
  const userId = auth.userId;
  if (!userId) return { error: "Not signed in" };
  if (!HANDLE_RE.test(handle)) return { error: "3–20 chars: a–z, 0–9, _" };
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    handle,
    display_name: displayName || null,
  });
  if (error) return { error: error.code === "23505" ? "That handle is taken" : error.message };
  write({ handle });
  return {};
};

/**
 * Sign out a real account: this device's local save is wiped, the cloud save stays,
 * and a fresh guest session starts. Reloads for a clean slate.
 */
export const signOutToGuest = async () => {
  clearLocalSave();
  try {
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
  } catch {
    /* offline — the reload still gives a clean local state */
  }
  window.location.reload();
};
