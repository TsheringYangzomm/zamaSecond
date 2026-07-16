import type { ReactNode } from "react";
import { tagOutline, tagYellow } from "./styles";

const statusToneClasses = {
  preview: "border-brand-forest bg-brand-yellow text-brand-black",
  planned: "border-brand-forest bg-brand-mint text-brand-green-ink",
  pending: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
} as const;

export function YellowTag({ children }: { children: ReactNode }) {
  return <p className={tagYellow}>{children}</p>;
}

export function OutlineTag({ children }: { children: ReactNode }) {
  return <p className={tagOutline}>{children}</p>;
}

export function StatusBadge({ children, tone = "preview", className = "" }: { children: ReactNode; tone?: keyof typeof statusToneClasses; className?: string }) {
  return (
    <span className={`inline-flex min-h-8 w-fit items-center rounded-full border-2 px-3 py-1 text-xs font-bold leading-none ${statusToneClasses[tone]} ${className}`}>
      {children}
    </span>
  );
}
