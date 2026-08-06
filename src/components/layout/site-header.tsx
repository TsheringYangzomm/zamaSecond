import { useCallback, useState } from "react";
import { useCart } from "../../cart-context";
import { useContent } from "../../cms/content-context";
import { SmallOutlineLink, SmallPrimaryLink } from "../ui/action-link";
import { ArrowIcon } from "../ui/icons";
import { navLinkClass } from "../ui/styles";

function navArrow(itemHref: string) {
  return itemHref.startsWith("#/") ? <ArrowIcon className="ml-1.5" /> : null;
}

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
  const { items: navItems, partnerLabel } = blocks.nav;

  return (
    <nav
      className="site-nav hidden sm:order-3 sm:col-span-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-[clamp(0.7rem,1.35vw,1.15rem)] sm:text-[1.03rem] md:order-none md:col-span-1 lg:flex-nowrap"
      aria-label="Main navigation"
    >
      {navItems.map((item) => (
        <a className={navLinkClass} href={item.href} key={item.href}>
          {item.label}
          {navArrow(item.href)}
        </a>
      ))}
      <a className={navLinkClass} href="#b2b">
        {partnerLabel}
        {navArrow("#b2b")}
      </a>
    </nav>
  );
}

function MobileNav({ onSelect, isOpen }: { onSelect: () => void; isOpen: boolean }) {
  const { blocks } = useContent();
  const { items: navItems, partnerLabel } = blocks.nav;

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
    </nav>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartQuantity, openCart } = useCart();
  const { blocks } = useContent();
  const { partnerLabel, joinLabel, joinShortLabel } = blocks.nav;
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const handleOpenCart = useCallback(() => {
    closeMenu();
    openCart();
  }, [closeMenu, openCart]);

  return (
    <header className="site-header sticky top-2.5 z-20 mx-auto mt-3 w-[calc(100%-16px)] max-w-280 rounded-[26px_18px_28px_14px/16px_30px_18px_28px] border-3 border-brand-forest px-2 py-[0.6rem] shadow-brand sm:w-[min(1260px,calc(100%-40px))] sm:px-[0.9rem] sm:py-[0.7rem]">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_1fr] sm:gap-3 md:grid-cols-[auto_1fr_auto]">
        <a className="brand inline-flex shrink-0 -rotate-2 items-center" href="#top" aria-label="Zama home">
          <img className="h-14 w-auto sm:h-16" src="assets/zama_logo.png" alt="Zama" width="144" height="94" />
        </a>

        <DesktopNav />

        <div className="header-actions hidden items-center gap-2 sm:flex sm:justify-end" aria-label="Primary actions">
          <SmallOutlineLink href="#b2b">{partnerLabel}</SmallOutlineLink>
          <SmallPrimaryLink href="#waitlist">{joinLabel}</SmallPrimaryLink>
          <CartButton onOpen={handleOpenCart} />
        </div>

        <div className="flex items-center justify-end gap-[0.55rem] sm:hidden">
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
