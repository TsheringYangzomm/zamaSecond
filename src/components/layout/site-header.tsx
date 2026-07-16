import { useCallback, useState } from "react";
import { navItems } from "../../data/landing";
import { SmallOutlineLink, SmallPrimaryLink } from "../ui/action-link";
import { navLinkClass } from "../ui/styles";

function DesktopNav() {
  return (
    <nav
      className="site-nav hidden sm:order-3 sm:col-span-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-[clamp(0.85rem,2.2vw,2.25rem)] sm:text-[1.07rem] md:order-none md:col-span-1"
      aria-label="Main navigation"
    >
      {navItems.map((item) => (
        <a className={navLinkClass} href={item.href} key={item.href}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function MobileNav({ onSelect, isOpen }: { onSelect: () => void; isOpen: boolean }) {
  return (
    <nav
      className={`grid min-h-0 gap-[0.6rem] overflow-hidden rounded-wobbly-md bg-brand-warm-white shadow-brand transition-[border-width,padding] duration-300 ${isOpen ? "border-3 border-brand-forest p-[0.9rem]" : "border-0 p-0"}`}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => (
        <a className={`${navLinkClass} text-[1.05rem]`} href={item.href} key={item.href} onClick={onSelect}>
          {item.label}
        </a>
      ))}
      <SmallOutlineLink className="mt-1 w-full" href="#b2b" onClick={onSelect}>
        Partner with us
      </SmallOutlineLink>
    </nav>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <header className="site-header sticky top-2.5 z-20 mx-auto mt-3 w-[calc(100%-28px)] max-w-280 rounded-[26px_18px_28px_14px/16px_30px_18px_28px] border-3 border-brand-forest px-[0.9rem] py-[0.7rem] shadow-brand sm:w-[min(1260px,calc(100%-40px))]">
      <div className="grid grid-cols-[auto_1fr] items-center gap-[0.9rem] sm:grid-cols-[auto_1fr] sm:gap-[1.4rem] md:grid-cols-[auto_1fr_auto]">
        <a className="brand inline-flex shrink-0 -rotate-2 items-center" href="#top" aria-label="Zama home">
          <img className="w-20 sm:w-24" src="assets/zama_logo.png" alt="Zama" width="96" height="42" />
        </a>

        <DesktopNav />

        <div className="header-actions hidden items-center gap-[0.7rem] sm:flex sm:justify-end" aria-label="Primary actions">
          <SmallOutlineLink href="#b2b">Partner with us</SmallOutlineLink>
          <SmallPrimaryLink href="#waitlist">Join launch updates</SmallPrimaryLink>
        </div>

        <div className="flex items-center justify-end gap-[0.55rem] sm:hidden">
          <SmallPrimaryLink className="px-3 text-[0.92rem]" href="#waitlist">
            Join
          </SmallPrimaryLink>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-wobbly-md border-3 border-brand-forest bg-brand-white text-brand-forest shadow-brand-tight transition-transform duration-120 ease-in-out active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMenu}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M3 5.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M3 10h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M3 14.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`mobile-menu grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out sm:hidden ${
          menuOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <MobileNav onSelect={closeMenu} isOpen={menuOpen} />
      </div>
    </header>
  );
}
