import type { ReactNode } from "react";
import { tagOutline, tagYellow } from "./styles";

export function YellowTag({ children }: { children: ReactNode }) {
  return <p className={tagYellow}>{children}</p>;
}

export function OutlineTag({ children }: { children: ReactNode }) {
  return <p className={tagOutline}>{children}</p>;
}
