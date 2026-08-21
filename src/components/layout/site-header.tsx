import { useCallback, useState } from "react";
import { useCart } from "../../cart-context";
import { useContent } from "../../cms/content-context";
import { useCustomerAuth } from "../../checkout/customer-auth";
import { SmallOutlineLink, SmallPrimaryLink } from "../ui/action-link";
import { ArrowIcon } from "../ui/icons";
import { btnOutlineSm, btnPrimarySm, navLinkClass } from "../ui/styles";

function navArrow(itemHref: string) {
  return itemHref.startsWith("#/") ? <ArrowIcon className="ml-1.5" /> : null;
}

const ghostActionClass =
  "inline-flex min-h-11 items-center gap-1.5 px-1.5 font-secondary font-bold text-brand-forest transition-colors duration-120 ease-in-out hover:text-brand-green-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4";

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4h2.2l1.55 10.05a2 2 0 0 0 1.98 1.7h8.84a2 2 0 0 0 1.94-1.5L21 8H6.05" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function CartButton({ onOpen }: { onOpen: () => void }) {
  const { cartQuantity, isCartOpen } = useCart();

  return (
    <button
      type="button"
      className="relative grid h-12 w-12 shrink-0 -translate-y-1 -rotate-1 touch-manipulation place-items-center rounded-[46%_54%_45%_55%/54%_44%_56%_46%] border-3 border-brand-forest bg-brand-yellow text-brand-forest shadow-brand-hover transition-[background-color,box-shadow,transform] duration-120 ease-in-out hover:bg-brand-white active:translate-y-0 active:rotate-0 active:shadow-brand-tight focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4"
      aria-label={`Open cart, ${cartQuantity} item${cartQuantity === 1 ? "" : "s"}`}
      aria-controls="cart-drawer"
      aria-expanded={isCartOpen}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <CartIcon />
      <span
        className="cart-count-badge absolute -right-1.5 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-brand-forest bg-brand-orange px-1 text-[0.68rem] font-bold leading-none text-brand-white"
        key={cartQuantity}
        aria-hidden="true"
      >
        {cartQuantity > 99 ? "99+" : cartQuantity}
      </span>
    </button>
  );
}

function DesktopNav() {
  const { blocks } = useContent();
  const { items: navItems } = blocks.nav;

  return (
    <nav
      className="site-nav hidden md:flex md:flex-wrap lg:flex-nowrap md:items-center md:justify-center md:gap-[clamp(0.75rem,1.2vw,1.6rem)] md:text-[1.02rem] md:font-bold xl:gap-[clamp(1.25rem,1.8vw,2.5rem)] xl:text-[1.06rem]"
      aria-label="Main navigation"
    >
      {navItems.map((item) => (
        <a className={navLinkClass} href={item.href} key={item.href}>
          {item.label}
          {navArrow(item.href)}
        </a>
      ))}
    </nav>
  );
}

function MobileNav({ onSelect, onAuth, isOpen }: { onSelect: () => void; onAuth: () => void; isOpen: boolean }) {
  const { blocks } = useContent();
  const { items: navItems, partnerLabel } = blocks.nav;
  const { status, signOut } = useCustomerAuth();

  const handleSignOut = () => {
    onSelect();
    void signOut();
  };

  return (
    <nav
      className={`grid min-h-0 gap-[0.4rem] overflow-hidden rounded-wobbly-md bg-brand-warm-white shadow-brand transition-[border-width,padding] duration-300 ${isOpen ? "border-3 border-brand-forest p-[0.9rem]" : "border-0 p-0"}`}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => (
        <a className={`${navLinkClass} text-[1.05rem]`} href={item.href} key={item.href} onClick={onSelect}>
          {item.label}
          {navArrow(item.href)}
        </a>
      ))}
      <SmallOutlineLink className="mt-1 w-full" href="#b2b" onClick={onSelect}>
        {partnerLabel}
      </SmallOutlineLink>
      {status === "signed-in" ? (
        <button className={`${btnOutlineSm} mt-1 w-full`} type="button" onClick={handleSignOut}>Sign out</button>
      ) : (
        <button className={`${btnPrimarySm} mt-1 w-full`} type="button" onClick={onAuth}>Sign in</button>
      )}
    </nav>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartQuantity, openCart, openAuth } = useCart();
  const { status, signOut } = useCustomerAuth();
  const { blocks } = useContent();
  const { partnerLabel, joinLabel, joinShortLabel } = blocks.nav;
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const handleOpenCart = useCallback(() => {
    closeMenu();
    openCart();
  }, [closeMenu, openCart]);
  const handleOpenAuth = useCallback(() => {
    closeMenu();
    openAuth();
  }, [closeMenu, openAuth]);
  const handleSignOut = useCallback(() => {
    closeMenu();
    void signOut();
  }, [closeMenu, signOut]);

  return (
    <header className="site-header sticky top-0 z-20 w-full border-b-3 border-brand-forest">
      <div className="mx-auto grid min-w-0 w-full max-w-[90rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[clamp(0.75rem,2vw,1.5rem)] px-[clamp(0.75rem,2.2vw,2.75rem)] py-[0.6rem] sm:py-[0.7rem] md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-[clamp(0.75rem,1.6vw,2rem)]">
        <a className="brand inline-flex shrink-0 items-center" href="#top" aria-label="Zama home">
          <img
            className="h-14 w-[5.35rem] sm:h-16 sm:w-[6.1rem] xl:h-20 xl:w-[7.65rem]"
            src="assets/zama_logo.png"
            alt="Zama"
            width="144"
            height="94"
          />
        </a>

        <DesktopNav />

        <div className="header-actions hidden items-center gap-x-2 md:flex md:justify-end xl:gap-x-3" aria-label="Primary actions">
          {status === "signed-in" ? (
            <>
              <span className="hidden shrink-0 md:inline-flex lg:hidden xl:inline-flex">
                <a className={ghostActionClass} href="#b2b">
                  {partnerLabel}
                  <ArrowIcon className="h-4 w-4" />
                </a>
              </span>
              <span className="hidden shrink-0 md:inline-flex">
                <button className={ghostActionClass} type="button" onClick={handleSignOut}>Sign out</button>
              </span>
            </>
          ) : (
            <>
              <span className="hidden shrink-0 md:inline-flex">
                <a className={ghostActionClass} href="#b2b">
                  {partnerLabel}
                  <ArrowIcon className="h-4 w-4" />
                </a>
              </span>
              <span className="hidden shrink-0 xl:inline-flex">
                <button className={ghostActionClass} type="button" onClick={handleOpenAuth}>Sign in</button>
              </span>
            </>
          )}
          <SmallPrimaryLink className="shrink-0" href="#waitlist">{joinLabel}</SmallPrimaryLink>
          <CartButton onOpen={handleOpenCart} />
        </div>

        <div className="flex items-center justify-end gap-[0.55rem] md:hidden">
          <SmallPrimaryLink className="px-3 text-[0.92rem]" href="#waitlist">
            {joinShortLabel}
          </SmallPrimaryLink>
          <CartButton onOpen={handleOpenCart} />
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
      <span className="sr-only" role="status" aria-live="polite">{cartQuantity} item{cartQuantity === 1 ? "" : "s"} in cart</span>

      <div
        id="mobile-menu"
        className={`mobile-menu grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out md:hidden ${
          menuOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <MobileNav onSelect={closeMenu} onAuth={handleOpenAuth} isOpen={menuOpen} />
      </div>
    </header>
  );
}
