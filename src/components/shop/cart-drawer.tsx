import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../../cart-context";
import { useContent } from "../../cms/content-context";
import { loadInventoryCatalog } from "../../checkout/inventory-catalog";
import { btnPrimaryKit, btnPrimaryLg } from "../ui/styles";
import { PackageIcon } from "../ui/icons";
import { numberFormatter, productPrice } from "./shop-utils";
import { resolveCartLines, type CartLine } from "./cart-lines";
import { AuthPane } from "./auth-pane";
import { CheckoutFlow } from "./checkout-flow";
import type { InventoryItemRow } from "../../cms/types";

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.27 6.96 8.73 5.05 8.73-5.05" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const stepperButtonClasses =
  "grid h-9 w-9 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

function CartItemLine({ line, onChange, onRemove }: { line: CartLine; onChange: (productId: string, difference: number) => void; onRemove: (productId: string) => void }) {
  const name = line.kind === "product" ? line.product.name : line.item.name;
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 shadow-brand-soft">
      {line.kind === "product" ? (
        <div className="brand-pattern grid h-18 w-18 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/28 p-1.5">
          <img className="h-full w-full object-contain" src={line.product.image} alt="" width="72" height="72" />
        </div>
      ) : (
        <div className="brand-pattern grid h-18 w-18 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/28 p-1.5 text-brand-green-ink">
          <PackageIcon className="h-8 w-8" />
        </div>
      )}
      <div className="grid min-w-0 gap-2">
        <div className="min-w-0">
          <p className="font-bold leading-tight text-brand-black">{name}</p>
          <p className="mt-1 text-xs leading-snug text-brand-black/64">
            {line.kind === "product"
              ? productPrice(line.product)
              : `${line.item.category || "Custom box item"}${line.item.unit ? ` · ${line.item.unit}` : ""} · Pricing pending`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
            <button className={stepperButtonClasses} type="button" onClick={() => onChange(line.key, -1)} aria-label={`Decrease ${name} quantity`}>−</button>
            <span className="min-w-7 text-center font-bold tabular-nums text-brand-black" aria-label={`${line.quantity} in cart`}>{line.quantity}</span>
            <button className={stepperButtonClasses} type="button" onClick={() => onChange(line.key, 1)} aria-label={`Increase ${name} quantity`}>+</button>
          </div>
          <button className="min-h-9 touch-manipulation rounded-wobbly-md px-2 text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onRemove(line.key)}>Remove</button>
        </div>
      </div>
    </li>
  );
}

function CustomBoxCard({ lines, onChange, onRemove }: { lines: CartLine[]; onChange: (productId: string, difference: number) => void; onRemove: (productId: string) => void }) {
  const totalCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <div className="grid gap-3 rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-mint/40 p-3" role="group" aria-label="Your custom box">
      <div className="flex items-center gap-2 border-b-2 border-dashed border-brand-forest/25 pb-2">
        <BoxIcon className="text-brand-green-ink" />
        <div className="grid min-w-0 gap-0.5">
          <p className="font-primary text-sm font-bold text-brand-black">Your custom box</p>
          <p className="text-xs text-brand-black/60">{totalCount} item{totalCount === 1 ? "" : "s"} · built by you</p>
        </div>
      </div>
      <ul className="grid gap-2">
        {lines.map((line) => {
          if (line.kind !== "inventory") return null;
          const name = line.item.name;
          return (
            <li className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 rounded-wobbly-md border-2 border-brand-forest/25 bg-brand-white p-2.5" key={line.key}>
              <div className="brand-pattern grid h-13 w-13 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/20 p-1 text-brand-green-ink">
                <PackageIcon className="h-6 w-6" />
              </div>
              <div className="grid min-w-0 gap-1">
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight text-brand-black">{name}</p>
                  <p className="text-[0.68rem] leading-snug text-brand-black/56">{line.item.category || "Custom box item"}{line.item.unit ? ` · ${line.item.unit}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
                    <button className="grid h-8 w-8 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(line.key, -1)} aria-label={`Decrease ${name} quantity`}>−</button>
                    <span className="min-w-6 text-center text-sm font-bold tabular-nums text-brand-black" aria-label={`${line.quantity} in box`}>{line.quantity}</span>
                    <button className="grid h-8 w-8 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(line.key, 1)} aria-label={`Increase ${name} quantity`}>+</button>
                  </div>
                  <button className="min-h-8 touch-manipulation rounded-wobbly-md px-1.5 text-[0.68rem] font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onRemove(line.key)}>Remove</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CartDrawer() {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const {
    cart,
    cartQuantity,
    isCartOpen,
    authPaneOpen,
    changeCartQuantity,
    removeFromCart,
    closeCart,
  } = useCart();
  const { products } = useContent();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadInventoryCatalog().then((rows) => {
      if (cancelled) return;
      setInventoryItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cartItems = resolveCartLines(cart, products, inventoryItems);
  const { customBoxLines, otherLines } = useMemo(() => {
    const customBox: CartLine[] = [];
    const other: CartLine[] = [];
    for (const line of cartItems) {
      if (line.kind === "inventory" && line.source === "custom-box") customBox.push(line);
      else other.push(line);
    }
    return { customBoxLines: customBox, otherLines: other };
  }, [cartItems]);

  const hasCompletePricing = cartItems.length > 0 && cartItems.every((line) => line.kind === "product" && line.product.priceAmount !== null);
  const subtotal = cartItems.reduce(
    (total, line) => total + (line.kind === "product" ? (line.product.priceAmount ?? 0) * line.quantity : 0),
    0,
  );

  useEffect(() => {
    if (isCartOpen) setCheckoutOpen(false);
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return;

    const returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute("inert"));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [closeCart, isCartOpen]);

  function browseProducts() {
    closeCart();
    window.setTimeout(() => {
      const productGrid = document.getElementById("product-grid");
      if (productGrid) {
        productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        productGrid.querySelector<HTMLButtonElement>("button")?.focus();
      } else {
        window.location.hash = "#/shop";
      }
    }, 0);
  }

  return (
    <div
      className={`cart-drawer-layer fixed inset-x-0 top-0 z-50 overflow-hidden transition-[visibility] duration-300 ${isCartOpen ? "visible" : "invisible"}`}
      aria-hidden={!isCartOpen}
    >
      <button
        className={`absolute inset-0 h-full w-full cursor-default border-0 bg-brand-black/52 transition-opacity duration-300 ${isCartOpen ? "opacity-100" : "opacity-0"}`}
        type="button"
        aria-label="Close cart"
        tabIndex={-1}
        onClick={closeCart}
      />
      <aside
        className={`cart-drawer absolute right-0 top-0 grid w-[min(100%,440px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l-4 border-brand-forest bg-brand-warm-white shadow-[-10px_0_0_color-mix(in_srgb,var(--color-brand-forest)_18%,transparent)] transition-transform duration-300 ease-out ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}
        id="cart-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-describedby="cart-drawer-description"
        inert={!isCartOpen}
      >
        <div className="relative flex items-start justify-between gap-4 border-b-3 border-dashed border-brand-forest bg-brand-yellow px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your launch cart</p>
            <h2 className="mt-1 font-primary text-[clamp(1.8rem,7vw,2.5rem)] font-bold leading-none text-brand-forest" id="cart-drawer-title">
              Market picks
              <span className="ml-2 inline-grid min-h-7 min-w-7 translate-y-[-0.15em] place-items-center rounded-full border-2 border-brand-forest bg-brand-orange px-1.5 font-secondary text-sm text-brand-white" aria-hidden="true">{cartQuantity}</span>
            </h2>
            <p className="mt-2 max-w-80 text-sm leading-snug text-brand-black/68" id="cart-drawer-description">Review your picks, then sign in or create an account at checkout to place your order.</p>
          </div>
          <button
            className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-wobbly-md border-3 border-brand-forest bg-brand-white text-brand-forest shadow-brand-tight hover:bg-brand-mint focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3"
            type="button"
            ref={closeButtonRef}
            aria-label="Close cart"
            onClick={closeCart}
          >
            <CloseIcon />
          </button>
        </div>

        {authPaneOpen ? (
          <AuthPane onClose={closeCart} />
        ) : checkoutOpen ? (
          <CheckoutFlow
            items={cartItems}
            subtotal={subtotal}
            onBack={() => setCheckoutOpen(false)}
          />
        ) : (
          <>
            <div className="overscroll-contain overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
              {cartItems.length > 0 ? (
                <ul className="grid gap-3">
                  {customBoxLines.length > 0 ? (
                    <li>
                      <CustomBoxCard lines={customBoxLines} onChange={changeCartQuantity} onRemove={removeFromCart} />
                    </li>
                  ) : null}
                  {otherLines.map((line) => (
                    <CartItemLine
                      key={line.key}
                      line={line}
                      onChange={changeCartQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </ul>
              ) : (
                <div className="grid min-h-full place-content-center justify-items-center gap-4 py-12 text-center">
                  <div className="brand-pattern grid h-24 w-24 place-items-center rounded-full border-3 border-dashed border-brand-forest text-brand-forest">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 4h2.2l1.55 10.05a2 2 0 0 0 1.98 1.7h8.84a2 2 0 0 0 1.94-1.5L21 8H6.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-primary text-2xl font-bold text-brand-black">Your cart is empty</h3>
                    <p className="mt-1 max-w-70 text-sm text-brand-black/64">Add a fresh box, meal kit, or grocery top-up to get started.</p>
                  </div>
                  <button className={`${btnPrimaryKit} gap-2`} type="button" onClick={browseProducts}>
                    Browse Products
                  </button>
                </div>
              )}
            </div>
            {cartItems.length > 0 ? (
              <div className="cart-summary-bar relative z-[2] grid gap-2 border-t-2 border-dashed border-brand-forest/32 bg-brand-warm-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_18px_color-mix(in_srgb,var(--color-brand-forest)_12%,transparent)] sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-black"><span className="tabular-nums">{cartQuantity}</span> item{cartQuantity === 1 ? "" : "s"}</p>
                  <p className="text-right font-bold text-brand-orange-ink">{hasCompletePricing ? `Nu. ${numberFormatter.format(subtotal)}` : "Pricing pending"}</p>
                </div>
                <button className={`${btnPrimaryLg} w-full`} type="button" onClick={() => setCheckoutOpen(true)}>
                  Checkout
                </button>
                <p className="text-xs text-brand-black/58">{hasCompletePricing ? "Estimated subtotal" : "Final total shown before payment"}</p>
              </div>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
