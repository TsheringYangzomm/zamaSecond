type IconProps = {
  className?: string;
};

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type StrokeIconProps = {
  className?: string;
};

export function SearchIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PanelLeftIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="12" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="16" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ShoppingBagIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PackageIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.3 7 8.7 5 8.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SproutIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12a4 4 0 0 0 4-4c0 0-2 0-4 2-2-2-4-2-4-2a4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListChecksIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 17 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3 7 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6h8M13 12h8M13 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RepeatIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m17 2 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7 22-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TruckIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function CreditCardIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="2" x2="22" y1="10" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FileTextIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LogOutIcon({ className }: StrokeIconProps) {
  return (
    <svg className={`shrink-0 ${className ?? ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 17 5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
