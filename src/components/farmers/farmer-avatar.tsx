const palette = [
  "bg-brand-yellow text-brand-black",
  "bg-brand-mint text-brand-forest",
  "bg-brand-leaf text-brand-white",
  "bg-brand-orange text-brand-white",
  "bg-brand-buff text-brand-forest",
  "bg-brand-green-ink text-brand-white",
] as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const parts = name.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function FarmerAvatar({ name, className = "" }: { name: string; className?: string }) {
  const tone = palette[hashName(name) % palette.length];
  return (
    <div className={`grid place-items-center font-primary text-[2rem] font-bold leading-none sm:text-[2.6rem] ${tone} ${className}`}>
      {initials(name)}
    </div>
  );
}
