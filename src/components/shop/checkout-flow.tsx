import { useMemo, useState } from "react";
import { useCart } from "../../cart-context";
import { useCustomerAuth } from "../../checkout/customer-auth";
import { submitOrder, type CustomerProfile } from "../../checkout/checkout-api";
import { btnPrimaryLg } from "../ui/styles";
import { PackageIcon } from "../ui/icons";
import { numberFormatter } from "./shop-utils";
import type { CartLine } from "./cart-lines";
import { AuthGate, Field, FlowBackLink, FlowNotice, SignInPanel, SignUpPanel, inputClasses, labelClasses, selectClasses, textAreaClasses } from "./auth-pane";

export function CheckoutFlow({ items, subtotal, onBack }: { items: CartLine[]; subtotal: number; onBack: () => void }) {
  const { status, profile, signOut } = useCustomerAuth();
  const [step, setStep] = useState<"gate" | "signup" | "login">("gate");
  const [result, setResult] = useState<{ orderId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSignOut() {
    void signOut();
    setError(null);
    setStep("gate");
  }

  if (status === "bootstrapping") {
    return (
      <div className="grid flex-1 place-content-center justify-items-center gap-3 px-5 text-center">
        <p className="text-sm font-semibold text-brand-black/68">Checking your account...</p>
      </div>
    );
  }

  if (result) {
    return <SuccessPanel orderId={result.orderId} onDone={() => undefined} />;
  }

  if (status === "signed-in" && profile) {
    return (
      <CheckoutForm
        key={profile.email}
        items={items}
        subtotal={subtotal}
        profile={profile}
        error={error}
        onError={setError}
        onPlaced={(orderId) => setResult({ orderId })}
        onSignOut={handleSignOut}
        onBack={onBack}
      />
    );
  }

  if (step === "signup") {
    return <SignUpPanel onSwitch={() => setStep("login")} onBack={onBack} />;
  }

  if (step === "login") {
    return <SignInPanel onSwitch={() => setStep("signup")} onBack={onBack} />;
  }

  return (
    <AuthGate
      mode="checkout"
      onSignUp={() => setStep("signup")}
      onSignIn={() => setStep("login")}
      onBack={onBack}
    />
  );
}

function OrderSummary({ items }: { items: CartLine[] }) {
  const { customBoxLines, otherLines } = useMemo(() => {
    const customBox: CartLine[] = [];
    const other: CartLine[] = [];
    for (const line of items) {
      if (line.kind === "inventory" && line.source === "custom-box") customBox.push(line);
      else other.push(line);
    }
    return { customBoxLines: customBox, otherLines: other };
  }, [items]);

  if (customBoxLines.length === 0 && otherLines.length === 0) return null;

  return (
    <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
      <h4 className={`${labelClasses} text-brand-orange-ink`}>Order summary</h4>
      {otherLines.length > 0 ? (
        <ul className="grid gap-2">
          {otherLines.map((line) => (
            <li className="flex items-center justify-between gap-2 text-sm" key={line.key}>
              <div className="min-w-0">
                <p className="font-bold text-brand-black">{line.kind === "product" ? line.product.name : line.item.name}</p>
                <p className="text-xs text-brand-black/56">{line.quantity}×{line.kind === "product" && line.product.priceAmount != null ? ` · Nu. ${line.product.priceAmount}` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {customBoxLines.length > 0 ? (
        <div className="rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-mint/40 p-3">
          <div className="flex items-center gap-2 pb-2">
            <PackageIcon className="h-4 w-4 text-brand-green-ink" />
            <p className="text-xs font-bold text-brand-black">Your custom box · {customBoxLines.reduce((s, l) => s + l.quantity, 0)} items</p>
          </div>
          <ul className="grid gap-1.5">
            {customBoxLines.map((line) => (
              line.kind !== "inventory" ? null : (
              <li className="flex items-center justify-between gap-2 text-xs" key={line.key}>
                <span className="font-bold text-brand-black">{line.item.name}</span>
                <span className="text-brand-black/56">{line.quantity}×{line.item.unit ? ` ${line.item.unit}` : ""}</span>
              </li>
              )
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CheckoutForm({ items, subtotal, profile, error, onError, onPlaced, onSignOut, onBack }: {
  items: CartLine[];
  subtotal: number;
  profile: CustomerProfile;
  error: string | null;
  onError: (error: string | null) => void;
  onPlaced: (orderId: string) => void;
  onSignOut: () => void;
  onBack: () => void;
}) {
  const { clearCart } = useCart();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [area, setArea] = useState(profile.area);
  const [dzongkhag, setDzongkhag] = useState(profile.dzongkhag);
  const [address, setAddress] = useState(profile.address);
  const [paymentMethod, setPaymentMethod] = useState("Cash on delivery");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const hasCompletePricing = items.length > 0 && items.every((line) => line.kind === "product" && line.product.priceAmount !== null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onError(null);
    if (!hasCompletePricing) return;
    setBusy(true);
    const result = await submitOrder({
      profile: {
        email: profile.email,
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        dzongkhag: dzongkhag.trim(),
        address: address.trim(),
      },
      lines: items.map((line) =>
        line.kind === "product"
          ? {
              productId: line.product.id,
              name: line.product.name,
              quantity: line.quantity,
              price: line.product.priceAmount ?? 0,
            }
          : {
              productId: line.item.id,
              name: line.item.name,
              quantity: line.quantity,
              price: 0,
            },
      ),
      paymentMethod,
      deliveryDate: deliveryDate || null,
      notes: notes.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    clearCart();
    onPlaced(result.orderId);
  }

  return (
    <form className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <h3 className="font-primary text-2xl font-bold text-brand-black">Checkout</h3>
        <p className="max-w-86 text-sm leading-snug text-brand-black/68">Signed in as <span className="font-bold text-brand-green-ink">{profile.email}</span>. Ordering as <span className="font-bold text-brand-green-ink">{name || "you"}</span>.</p>
      </div>

      <OrderSummary items={items} />

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <h4 className={`${labelClasses} text-brand-orange-ink`}>Delivery details</h4>
        <Field label="Full name" htmlFor="checkout-name">
          <input className={inputClasses} id="checkout-name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="checkout-phone">
          <input className={inputClasses} id="checkout-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Area" htmlFor="checkout-area">
            <input className={inputClasses} id="checkout-area" type="text" autoComplete="address-level2" required value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Thimphu" />
          </Field>
          <Field label="Dzongkhag" htmlFor="checkout-dzongkhag">
            <input className={inputClasses} id="checkout-dzongkhag" type="text" autoComplete="address-level1" value={dzongkhag} onChange={(event) => setDzongkhag(event.target.value)} />
          </Field>
        </div>
        <Field label="Street address" htmlFor="checkout-address">
          <input className={inputClasses} id="checkout-address" type="text" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Optional notes like landmarks" />
        </Field>
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <h4 className={`${labelClasses} text-brand-orange-ink`}>Payment</h4>
        <Field label="Payment method" htmlFor="checkout-payment">
          <select className={selectClasses} id="checkout-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="Cash on delivery">Cash on delivery</option>
            <option value="Bank transfer">Bank transfer</option>
          </select>
        </Field>
        <Field label="Preferred delivery date (optional)" htmlFor="checkout-delivery-date">
          <input className={inputClasses} id="checkout-delivery-date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </Field>
        <Field label="Order notes (optional)" htmlFor="checkout-notes">
          <textarea className={textAreaClasses} id="checkout-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything we should know about this order?" />
        </Field>
      </section>

      {error ? <FlowNotice>{error}</FlowNotice> : null}
      {!hasCompletePricing ? <FlowNotice>Some items don't have final prices yet. We'll confirm the total before payment.</FlowNotice> : null}

      <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-4 shadow-brand-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-brand-black"><span className="tabular-nums">{items.length}</span> item{items.length === 1 ? "" : "s"}</p>
          <p className="text-right font-bold text-brand-orange-ink">{hasCompletePricing ? `Nu. ${numberFormatter.format(subtotal)}` : "Pricing pending"}</p>
        </div>
        <button className={`${btnPrimaryLg} mt-3 w-full`} type="submit" disabled={busy || !hasCompletePricing}>
          {busy ? "Placing order..." : `Place order · ${hasCompletePricing ? `Nu. ${numberFormatter.format(subtotal)}` : "pending"}`}
        </button>
        <p className="mt-2 text-xs text-brand-black/58">Orders appear in the admin Orders section as "pending" once placed.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FlowBackLink onClick={onBack}>← Back to cart</FlowBackLink>
        <button className="min-h-8 touch-manipulation px-1 text-sm font-bold text-brand-black/64 underline decoration-dashed underline-offset-4 hover:text-brand-green-ink" type="button" onClick={onSignOut}>Sign out</button>
      </div>
    </form>
  );
}

function SuccessPanel({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { clearCart, closeCart } = useCart();
  function done() {
    clearCart();
    closeCart();
    onDone();
  }
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-4 px-5 text-center">
      <div className="brand-pattern grid h-24 w-24 place-items-center rounded-full border-3 border-dashed border-brand-forest text-brand-forest">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h3 className="font-primary text-2xl font-bold text-brand-black">Order placed!</h3>
        <p className="mx-auto mt-1 max-w-72 text-sm leading-snug text-brand-black/68">Your order <span className="font-bold text-brand-green-ink">{orderId}</span> is confirmed and waiting in the admin Orders section.</p>
      </div>
      <button className={`${btnPrimaryLg} w-full`} type="button" onClick={done}>Done</button>
    </div>
  );
}
