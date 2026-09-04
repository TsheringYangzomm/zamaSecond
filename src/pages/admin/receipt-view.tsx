import { useEffect, useRef } from "react";
import { formatMoney } from "./commerce-shared";
import type { Delivery, Order } from "../../admin/commerce-types";
import type { Customer } from "../../admin/commerce-types";

type ReceiptViewProps = {
  order: Order;
  customer: Customer | null;
  delivery: Delivery | null;
  onClose: () => void;
};

function formatReceiptDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

const paymentStatusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

export function ReceiptView({ order, customer, delivery, onClose }: ReceiptViewProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lineTotal = (price: number, quantity: number) => price * quantity;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-brand-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div className="mx-auto grid w-full max-w-135 gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest bg-brand-forest px-4 py-1.5 text-sm font-bold text-brand-white hover:bg-brand-leaf focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => window.print()}>Print receipt</button>
          <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest/40 bg-brand-white px-4 py-1.5 text-sm font-bold text-brand-green-ink hover:border-brand-forest hover:bg-brand-warm-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={onClose}>Close</button>
        </div>

        <div
          id="receipt-print-area"
          className="rounded-[24px_32px_20px_28px/28px_20px_32px_24px] border-3 border-brand-forest bg-brand-white p-6 shadow-brand-big sm:p-8"
          style={{ fontFamily: "inherit" }}
        >
          <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-3 border-dashed border-brand-forest/25 pb-4">
              <div className="grid gap-1">
                <img className="w-24" src="assets/zama_logo.png" alt="Zama" width="96" height="41" />
                <h2 id="receipt-title" className="font-primary text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.02] text-brand-green-ink">Delivery receipt</h2>
              </div>
              <div className="grid gap-1 text-right text-xs">
                <p className="font-bold uppercase tracking-[0.1em] text-brand-green-ink">Receipt / Order</p>
                <p className="tabular-nums font-bold text-brand-black">{order.id}</p>
                {delivery ? (
                  <>
                    <p className="pt-1 font-bold uppercase tracking-[0.1em] text-brand-green-ink">Delivery</p>
                    <p className="tabular-nums font-bold text-brand-black">{delivery.id}</p>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-0.5">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Customer</span>
                <span className="font-bold text-brand-black">{customer?.name ?? order.customer_id}</span>
                {customer?.phone ? <span className="text-sm text-brand-black/68">{customer.phone}</span> : null}
                {order.delivery_area ? <span className="text-sm text-brand-black/68">{order.delivery_area}</span> : null}
              </div>
              <div className="grid gap-0.5 sm:text-right">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Delivery date</span>
                <span className="font-bold text-brand-black">{formatReceiptDate(delivery?.delivery_date ?? order.delivery_date)}</span>
                <span className="text-sm text-brand-black/68">Placed {formatReceiptDate(order.created_at)}</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-wobbly-card border-3 border-brand-forest">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Order items</caption>
                <thead>
                  <tr className="border-b-3 border-dashed border-brand-forest/25 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Price</th>
                    <th className="px-3 py-2.5 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr className="border-b-2 border-dashed border-brand-forest/15 last:border-b-0" key={`${item.product_id}-${index}`}>
                      <td className="px-3 py-2.5 font-bold text-brand-black">{item.name}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-brand-black/72">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-brand-black/72">{formatMoney(item.price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-brand-black">{formatMoney(lineTotal(item.price, item.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-3 border-dashed border-brand-forest/25 bg-brand-warm-white">
                    <td className="px-3 py-2.5 font-bold uppercase tracking-[0.1em] text-brand-green-ink" colSpan={3}>Total</td>
                    <td className="px-3 py-2.5 text-right font-primary text-lg font-bold text-brand-orange-ink">{formatMoney(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-warm-white p-4 sm:grid-cols-2">
              <div className="grid gap-0.5">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Payment</span>
                <span className="font-bold text-brand-black">{order.payment_method || "Not recorded"}</span>
                <span className={`w-fit rounded-full border-2 px-2 py-0.5 text-xs font-bold ${order.payment_status === "paid" ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-orange-ink bg-brand-buff text-brand-orange-ink"}`}>
                  {paymentStatusLabels[order.payment_status] ?? order.payment_status}
                </span>
                {order.payment_reference ? <span className="text-sm text-brand-black/68">Ref: {order.payment_reference}</span> : null}
              </div>
              {order.notes ? (
                <div className="grid gap-0.5">
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Notes</span>
                  <span className="text-sm text-brand-black/72">{order.notes}</span>
                </div>
              ) : null}
            </div>

            <p className="border-t-3 border-dashed border-brand-forest/25 pt-4 text-center italic text-brand-black/60">
              Thank you for ordering with Zama.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
