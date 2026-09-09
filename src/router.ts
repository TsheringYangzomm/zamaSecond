import { categorySlugs } from "./components/shop/shop-utils";

export type Route = "home" | "contact" | "partnership" | "shop" | "product" | "category" | "farmers" | "farmer" | "customize" | "launch-updates" | "membership" | "account" | "account-orders" | "account-wallet" | "account-membership" | "coupons" | "admin" | "admin-password-reset" | "meal-kit-trust";

export function getRoute(
  hash: string,
  search = typeof window === "undefined" ? "" : window.location.search,
  pathname = typeof window === "undefined" ? "" : window.location.pathname,
): Route {
  const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashValue.includes("?") ? hashValue.slice(hashValue.indexOf("?") + 1) : hashValue);
  const searchParams = new URLSearchParams(search);
  const recoveryError = hashParams.get("error_code") === "otp_expired" || (hashParams.get("error") === "access_denied" && /expired|invalid/i.test(hashParams.get("error_description") ?? ""));
  if (pathname.replace(/\/+$/, "").endsWith("/reset-password") || hash.startsWith("#/reset-password") || hashParams.get("type") === "recovery" || recoveryError || searchParams.has("code")) return "admin-password-reset";
  if (hash.startsWith("#/admin")) return "admin";
  if (hash.startsWith("#/coupons")) return "coupons";
  if (hash.startsWith("#/account/wallet")) return "account-wallet";
  if (hash.startsWith("#/account/membership")) return "account-membership";
  if (hash.startsWith("#/account/orders")) return "account-orders";
  if (hash.startsWith("#/account")) return "account";
  if (hash.startsWith("#/partnership")) return "partnership";
  if (hash.startsWith("#/contact")) return "contact";
  if (hash.startsWith("#/customize")) return "customize";
  if (hash.startsWith("#/farmers/")) return "farmer";
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

export function getFarmerId(hash: string): string | null {
  if (!hash.startsWith("#/farmers/")) return null;
  const id = hash.slice("#/farmers/".length).split(/[/?#]/)[0];
  return id ? decodeURIComponent(id) : null;
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
