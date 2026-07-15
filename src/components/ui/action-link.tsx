import type { ReactNode } from "react";
import { btnOutlineLg, btnOutlineSm, btnPrimaryLg, btnPrimarySm } from "./styles";

export type ActionLinkProps = {
  children: ReactNode;
  href: string;
  className?: string;
  onClick?: () => void;
};

export function ActionLink({ children, href, className, onClick }: ActionLinkProps) {
  return (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  );
}

type StyledLinkProps = Omit<ActionLinkProps, "className"> & { className?: string };

export function PrimaryLink(props: StyledLinkProps) {
  return <ActionLink {...props} className={`${btnPrimaryLg} ${props.className ?? ""}`} />;
}

export function OutlineLink(props: StyledLinkProps) {
  return <ActionLink {...props} className={`${btnOutlineLg} ${props.className ?? ""}`} />;
}

export function SmallPrimaryLink(props: StyledLinkProps) {
  return <ActionLink {...props} className={`${btnPrimarySm} ${props.className ?? ""}`} />;
}

export function SmallOutlineLink(props: StyledLinkProps) {
  return <ActionLink {...props} className={`${btnOutlineSm} ${props.className ?? ""}`} />;
}

export function PrimaryButton({ children, className, type = "submit" }: { children: ReactNode; className?: string; type?: "button" | "submit" }) {
  return (
    <button className={`${btnPrimaryLg} ${className ?? ""}`} type={type}>
      {children}
    </button>
  );
}
