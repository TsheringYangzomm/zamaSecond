import { useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { uploadCatalogImage } from "../../admin/admin-api";

export const inputClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

export const textAreaClasses =
  "min-h-24 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{label}</label>
      {children}
      {hint ? <p className="text-xs text-brand-black/56">{hint}</p> : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { className?: string };

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={`${inputClasses} ${className ?? ""}`} {...props} />;
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string };

export function TextArea({ className, ...props }: TextAreaProps) {
  return <textarea className={`${textAreaClasses} ${className ?? ""}`} {...props} />;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/40 bg-brand-white px-3 py-2 text-sm font-bold text-brand-black">
      <input type="checkbox" className="h-5 w-5 accent-brand-forest" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

type ImagePickerProps = {
  label: string;
  image: string;
  onChange: (url: string) => void;
  folder: "products" | "farmers";
  id: string;
};

export function ImagePicker({ label, image, onChange, folder, id }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await uploadCatalogImage(file, folder, id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{label}</span>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid gap-2">
          <input
            className={`${inputClasses} font-normal`}
            type="url"
            value={image}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste an image URL, or upload a file"
          />
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          {busy ? <p className="text-sm font-semibold text-brand-green-ink">Uploading...</p> : null}
          {error ? <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-1 sm:justify-items-end">
          <button
            type="button"
            className="min-h-11 touch-manipulation rounded-full border-2 border-brand-forest bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-black transition-colors duration-120 ease-in-out hover:bg-brand-buff focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:opacity-50"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Upload image
          </button>
          {image ? (
            <img className="h-20 w-20 rounded-wobbly-md border-2 border-brand-forest bg-brand-white object-contain p-1 shadow-brand-soft" src={image} alt="" aria-hidden="true" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
