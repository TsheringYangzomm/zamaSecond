import { requireClient } from "./admin-api";

export type DeductionResult = { deducted: boolean };

export type ShortageInfo = {
  itemId: string;
  itemName: string;
  unit: string;
  required: number;
  available: number;
};

function formatQty(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function shortagesMessage(shortages: ShortageInfo[]): string {
  return shortages
    .map((shortage) => {
      const unit = shortage.unit ? ` ${shortage.unit}` : "";
      return `Not enough ${shortage.itemName} available for this order (need ${formatQty(shortage.required)}${unit}, have ${formatQty(shortage.available)}${unit}).`;
    })
    .join(" ");
}

// Deducts the ingredients a confirmed order consumes via the atomic
// public.deduct_order_inventory RPC (see supabase/inventory-schema.sql).
//
// When the inventory system is not set up yet (migration not applied) this is
// a best-effort no-op so order confirmation keeps working exactly as before.
// When it IS set up, an insufficient-stock result throws a shortage message and
// the order is NOT confirmed, so inventory can never go negative.
export async function deductInventoryForOrder(
  orderId: string,
  items: { product_id: string; quantity: number }[],
  adminEmail: string,
): Promise<DeductionResult> {
  let client;
  try {
    client = requireClient();
  } catch {
    return { deducted: false };
  }

  const probe = await client.from("product_ingredients").select("product_id").limit(1);
  if (probe.error) return { deducted: false };

  const { data, error } = await client.rpc("deduct_order_inventory", {
    p_order_id: orderId,
    p_items: items,
    p_admin_email: adminEmail,
  });
  if (error) return { deducted: false };

  const result = data as { status?: string; deducted?: boolean; shortages?: ShortageInfo[] } | null;
  if (result?.status === "insufficient" && result.shortages && result.shortages.length > 0) {
    throw new Error(shortagesMessage(result.shortages));
  }
  if (result?.status !== "ok") {
    return { deducted: false };
  }
  return { deducted: result.deducted ?? false };
}
