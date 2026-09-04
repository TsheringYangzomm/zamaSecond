import { categorySlugs } from "./components/shop/shop-utils";

export type Route = "home" | "contact" | "shop" | "product" | "category" | "farmers" | "customize" | "launch-updates" | "membership" | "account" | "account-orders" | "account-wallet" | "admin" | "meal-kit-trust";

export function getRoute(hash: string): Route {
  if (hash.startsWith("#/admin")) return "admin";
  if (hash.startsWith("#/account/wallet")) return "account-wallet";
  if (hash.startsWith("#/account/orders")) return "account-orders";
  if (hash.startsWith("#/account")) return "account";
  if (hash.startsWith("#/contact")) return "contact";
  if (hash.startsWith("#/customize")) return "customize";
  if (hash.startsWith("#/farmers")) return "farmers";
  if (hash.startsWith("#/launch-updates")) return "launch-updates";
  if (hash.startsWith("#/meal-kit-trust")) return "meal-kit-trust";
  if (hash.startsWith("#/membership")) return "membership";
  if (hash.startsWith("#/shop/")) {
    const slug = hash.slice("#/shop/".length).split(/[/?#]/)[0];
    if (slug && categorySlugs.includes(slug as typeof categorySlugs[number])) return "category";
    return "product";
  }
  if (hash.startsWith("#/shop")) return "shop";
  return "home";
}

export function getProductId(hash: string): string | null {
  if (!hash.startsWith("#/shop/")) return null;
  const slug = hash.slice("#/shop/".length).split(/[/?#]/)[0];
  if (!slug || categorySlugs.includes(slug as typeof categorySlugs[number])) return null;
  return slug;
}

export function getCategoryFromHash(hash: string): string | null {
  if (!hash.startsWith("#/shop/")) return null;
  const slug = hash.slice("#/shop/".length).split(/[/?#]/)[0];
  if (!slug || !categorySlugs.includes(slug as typeof categorySlugs[number])) return null;
  return slug;
}

let pendingSection: string | null = null;

export function setPendingSection(section: string) {
  pendingSection = section;
}

export function takePendingSection(): string | null {
  const section = pendingSection;
  pendingSection = null;
  return section;
}
