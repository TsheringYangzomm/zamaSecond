type ToastTone = "success" | "notice";

export type ToastMessage = {
  message: string;
  tone: ToastTone;
};

type ToastProps = {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
};

const toneStyles: Record<ToastTone, string> = {
  success: "border-brand-forest bg-brand-yellow text-brand-forest",
  notice: "border-brand-orange-ink bg-brand-warm-white text-brand-black",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
        <path d="m8 12.4 2.7 2.6L16 9.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 16.2h.01" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Toast({ message, tone, onDismiss }: ToastProps) {
  return (
    <div
      className={`toast-life fixed left-1/2 top-24 z-50 flex w-[calc(100%-24px)] max-w-105 items-center gap-3 rounded-[18px_26px_14px_22px/22px_14px_26px_18px] border-3 px-4 py-3 text-[0.95rem] font-bold leading-snug shadow-brand sm:top-28 sm:max-w-110 ${toneStyles[tone]}`}
      role="status"
      aria-live="polite"
    >
      <ToastIcon tone={tone} />
      <span>{message}</span>
      <button
        type="button"
        className="ml-auto grid h-8 w-8 shrink-0 touch-manipulation place-items-center rounded-full border-2 border-current/40 text-current transition-colors duration-120 ease-in-out hover:border-current focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4"
        aria-label="Close notification"
        onClick={onDismiss}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
