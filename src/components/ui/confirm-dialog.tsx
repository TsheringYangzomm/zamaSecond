import { useEffect, useRef } from "react";
import { btnOutlineSm, btnPrimarySm } from "./styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    confirmRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-black/60 px-4 py-10"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="grid w-full max-w-105 gap-4 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-7">
        <h2 id="confirm-dialog-title" className="font-primary text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-[1.05] text-brand-green-ink">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-sm leading-[1.5] text-brand-black/72">
          {message}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            ref={confirmRef}
            className={btnPrimarySm}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting..." : confirmLabel}
          </button>
          <button className={btnOutlineSm} type="button" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
