import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  continueWithGoogle,
  getAuth,
  handleAvailable,
  handleSuggestions,
  HANDLE_RE,
  saveHandle,
  sendEmailCode,
  verifyEmailCode,
  type EmailFlow,
} from "@/lib/auth";
import { usePlayerState } from "@/lib/playerStore";
import { sfx } from "@/game/sounds";
import { GamePanel, IconChip } from "./GamePanel";

const btn =
  "rounded-[3px] border-2 border-ink px-3 py-1.5 font-display text-sm font-bold transition disabled:opacity-50";
const input =
  "h-9 w-full rounded-[3px] border-2 border-ink bg-panel px-2 font-body text-sm text-panel-foreground outline-none";

/** Google's multicolor "G", 18×18 — brand guidelines, do not recolor */
const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

type Step = "choose" | "code" | "handle";

/**
 * "Save your dorm" (guest → real account) and "Sign in" (returning player).
 * Google links to the guest when free; an email that already has an account signs
 * into it instead, and saveSync's conflict dialog takes it from there.
 */
export const SaveDormPanel = ({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: "save" | "signin";
  onClose: () => void;
}) => {
  const { playerName } = usePlayerState();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [flow, setFlow] = useState<EmailFlow>("link");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [handleState, setHandleState] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");
  const suggestions = handleSuggestions(playerName);
  const handleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setStep("choose");
      setCode("");
      setError(null);
      setHandle("");
      setHandleState("idle");
    }
  }, [open, mode]);

  useEffect(() => () => window.clearTimeout(handleTimer.current), []);

  if (!open) return null;

  /** after any successful link/sign-in: same account → handle step (save) or done */
  const afterAuth = (switchedAccount?: boolean) => {
    if (switchedAccount) {
      // saveSync's conflict dialog decides which dorm wins
      onClose();
      return;
    }
    if (mode === "save" && !getAuth().handle) setStep("handle");
    else {
      toast("You're signed in");
      onClose();
    }
  };

  const google = async () => {
    sfx.uiClick();
    setBusy(true);
    setError(null);
    const r = await continueWithGoogle();
    setBusy(false);
    if (r.error) setError(r.error);
    else if (!r.redirected) afterAuth(r.switchedAccount);
  };

  const sendCode = async () => {
    sfx.uiClick();
    setBusy(true);
    setError(null);
    const r = await sendEmailCode(email.trim(), mode === "save" ? "link" : "signin");
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setFlow(r.flow);
      setStep("code");
    }
  };

  const verify = async () => {
    sfx.uiClick();
    setBusy(true);
    setError(null);
    const r = await verifyEmailCode(email.trim(), code.trim(), flow);
    setBusy(false);
    if (r.error) setError(r.error);
    else afterAuth(r.switchedAccount);
  };

  const pickHandle = (h: string) => {
    setHandle(h);
    window.clearTimeout(handleTimer.current);
    if (!HANDLE_RE.test(h)) {
      setHandleState(h ? "invalid" : "idle");
      return;
    }
    setHandleState("checking");
    handleTimer.current = window.setTimeout(async () => {
      const free = await handleAvailable(h);
      setHandleState((cur) => (cur === "checking" ? (free ? "free" : "taken") : cur));
    }, 400);
  };

  const saveHandleStep = async () => {
    sfx.uiClick();
    setBusy(true);
    const r = await saveHandle(handle, playerName);
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      toast("Dorm saved — see you on any device");
      onClose();
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GamePanel accent="#7f9c86" className="max-h-[88%] w-[min(100%,440px)] overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-panel-foreground">
            {mode === "save" ? "Save your dorm" : "Sign in"}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <IconChip>
              <X className="size-3" aria-hidden />
            </IconChip>
          </button>
        </div>

        {step === "choose" ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-panel-muted">
              {mode === "save"
                ? "Save your dorm so it's there on any device."
                : "Sign in to load your dorm on this device."}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={google}
              className="flex w-full items-center justify-center gap-2.5 rounded-[3px] border border-[#747775] bg-white px-3 py-2 text-sm font-medium text-[#1F1F1F] transition disabled:opacity-50"
            >
              <GoogleG />
              Continue with Google
            </button>
            <div className="flex items-center gap-2">
              <span className="h-0.5 flex-1 bg-ink/15" />
              <span className="font-body text-[11px] font-bold uppercase text-panel-muted">or</span>
              <span className="h-0.5 flex-1 bg-ink/15" />
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                className={input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <button
                type="button"
                disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
                onClick={sendCode}
                className={`${btn} shrink-0 bg-ink text-panel`}
              >
                Email me a code
              </button>
            </div>
            <p className="font-body text-[11px] text-panel-muted">No password — we email you a 6-digit code.</p>
          </div>
        ) : null}

        {step === "code" ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-panel-muted">
              We sent a 6-digit code to <span className="font-bold text-panel-foreground">{email}</span>.
            </p>
            <div className="flex gap-2">
              <input
                className={`${input} tracking-[0.3em]`}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-label="6-digit code"
              />
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={verify}
                className={`${btn} shrink-0 bg-ink text-panel`}
              >
                Verify
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                sfx.uiClick();
                setStep("choose");
              }}
              className="font-body text-[11px] text-panel-muted underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : null}

        {step === "handle" ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-panel-muted">Last thing — pick a handle.</p>
            <div className="flex items-center gap-1">
              <span className="font-display text-sm font-bold text-panel-muted">@</span>
              <input
                className={input}
                placeholder="your_handle"
                maxLength={20}
                value={handle}
                onChange={(e) => pickHandle(e.target.value.toLowerCase())}
                aria-label="Handle"
              />
              <span className="w-5 shrink-0">
                {handleState === "checking" ? <Loader2 className="size-4 animate-spin text-panel-muted" aria-hidden /> : null}
                {handleState === "free" ? <Check className="size-4 text-panel-foreground" aria-hidden /> : null}
              </span>
            </div>
            {handleState === "taken" ? (
              <p className="font-body text-[11px] font-bold text-destructive">That handle is taken.</p>
            ) : null}
            {handleState === "invalid" ? (
              <p className="font-body text-[11px] text-panel-muted">3–20 chars: a–z, 0–9, _</p>
            ) : null}
            {suggestions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      sfx.uiClick();
                      pickHandle(s);
                    }}
                    className="rounded-[3px] border-2 border-ink bg-secondary px-2 py-0.5 font-body text-xs font-bold text-secondary-foreground"
                  >
                    @{s}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy || handleState !== "free"}
                onClick={saveHandleStep}
                className={`${btn} bg-ink text-panel`}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-2 font-body text-[11px] font-bold text-destructive">{error}</p> : null}
      </GamePanel>
    </div>
  );
};
