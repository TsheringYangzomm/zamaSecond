import type { Cart } from "../../cart-context";
import type { InventoryItemRow } from "../../cms/types";
import type { ShopProduct } from "./shop-utils";

const customCartKeyPrefix = "custom:";
const customBoxCartKeyPrefix = "custom-box:";

export function customCartKey(itemId: string): string {
  return `${customCartKeyPrefix}${itemId}`;
}

export function isCustomCartKey(key: string): boolean {
  return key.startsWith(customCartKeyPrefix);
}

export function customItemId(key: string): string {
  return key.slice(customCartKeyPrefix.length);
}

export function customBoxCartKey(itemId: string): string {
  return `${customBoxCartKeyPrefix}${itemId}`;
}

export function isCustomBoxCartKey(key: string): boolean {
  return key.startsWith(customBoxCartKeyPrefix);
}

export function customBoxItemId(key: string): string {
  return key.slice(customBoxCartKeyPrefix.length);
}

export type CartLine =
  | { kind: "product"; key: string; product: ShopProduct; quantity: number }
  | { kind: "inventory"; key: string; item: InventoryItemRow; quantity: number; source: "individual" | "custom-box" };

export function resolveCartLines(
  cart: Cart,
  products: readonly ShopProduct[],
  inventoryItems: readonly InventoryItemRow[],
): CartLine[] {
  const lines: CartLine[] = [];
  for (const [key, quantity] of Object.entries(cart)) {
    if (quantity <= 0) continue;
    if (isCustomBoxCartKey(key)) {
      const item = inventoryItems.find((candidate) => candidate.id === customBoxItemId(key));
      if (item) lines.push({ kind: "inventory", key, item, quantity, source: "custom-box" });
    } else if (isCustomCartKey(key)) {
      const item = inventoryItems.find((candidate) => candidate.id === customItemId(key));
      if (item) lines.push({ kind: "inventory", key, item, quantity, source: "individual" });
    } else {
      const product = products.find((candidate) => candidate.id === key);
      if (product) lines.push({ kind: "product", key, product, quantity });
    }
  }
  return lines;
}
