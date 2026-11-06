import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuth } from "@/lib/auth";
import { sfx } from "@/game/sounds";
import { GamePanel, IconChip } from "./GamePanel";

const KINDS = [
  { id: "love", label: "Love it" },
  { id: "confusing", label: "Confusing" },
  { id: "bug", label: "Bug" },
  { id: "idea", label: "Idea" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

/**
 * In-the-moment tester feedback (Iteration 27). Works for guests too; the context
 * blob (where they were, what was open, device) is attached automatically.
 */
export const FeedbackPanel = ({
  open,
  onClose,
  getContext,
}: {
  open: boolean;
  onClose: () => void;
  getContext: () => Record<string, unknown>;
}) => {
  const [kind, setKind] = useState<Kind | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const send = async () => {
    if (!kind || !note.trim()) return;
    sfx.uiClick();
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: getAuth().userId,
      kind,
      note: note.trim().slice(0, 1000),
      context: getContext(),
    });
    setBusy(false);
    if (error) {
      toast("Couldn't send — try again");
      return;
    }
    toast("Thanks — sent.");
    setKind(null);
    setNote("");
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GamePanel accent="#c8765c" className="max-h-[88%] w-[min(100%,440px)] overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-panel-foreground">Send feedback</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <IconChip>
              <X className="size-3" aria-hidden />
            </IconChip>
          </button>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => {
                sfx.uiClick();
                setKind(k.id);
              }}
              className={`rounded-[3px] border-2 border-ink px-2.5 py-1 font-display text-xs font-bold ${
                kind === k.id ? "bg-ink text-panel" : "bg-panel text-panel-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          className="min-h-24 w-full rounded-[3px] border-2 border-ink bg-panel p-2 font-body text-sm text-panel-foreground outline-none"
          placeholder="What's on your mind?"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Feedback"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-body text-[11px] tabular-nums text-panel-muted">{note.length}/1000</span>
          <button
            type="button"
            disabled={busy || !kind || !note.trim()}
            onClick={send}
            className="rounded-[3px] border-2 border-ink bg-ink px-4 py-1.5 font-display text-sm font-bold text-panel disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </GamePanel>
    </div>
  );
};
