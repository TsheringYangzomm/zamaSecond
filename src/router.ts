import { categorySlugs } from "./components/shop/shop-utils";

export type Route = "home" | "contact" | "partnership" | "shop" | "product" | "category" | "farmers" | "farmer" | "customize" | "launch-updates" | "membership" | "account" | "account-orders" | "account-wallet" | "account-membership" | "coupons" | "admin" | "admin-password-reset" | "auth-jaggle" | "meal-kit-trust" | "not-found";

export function getRoute(
  hash: string,
  search = typeof window === "undefined" ? "" : window.location.search,
  pathname = typeof window === "undefined" ? "" : window.location.pathname,
): Route {
  const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = hash.startsWith("#/") ? hashValue : pathname || "/";
  const hashParams = new URLSearchParams(hashValue.includes("?") ? hashValue.slice(hashValue.indexOf("?") + 1) : hashValue);
  const searchParams = new URLSearchParams(search);
  const recoveryError = hashParams.get("error_code") === "otp_expired" || (hashParams.get("error") === "access_denied" && /expired|invalid/i.test(hashParams.get("error_description") ?? ""));
  if (pathname.replace(/\/+$/, "").endsWith("/reset-password") || hash.startsWith("#/reset-password") || hashParams.get("type") === "recovery" || recoveryError || searchParams.has("code")) return "admin-password-reset";
  if (path.startsWith("/auth/jaggle")) return "auth-jaggle";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/coupons")) return "coupons";
  if (path.startsWith("/account/wallet")) return "account-wallet";
  if (path.startsWith("/account/membership")) return "account-membership";
  if (path.startsWith("/account/orders")) return "account-orders";
  if (path.startsWith("/account")) return "account";
  if (path.startsWith("/partnership")) return "partnership";
  if (path.startsWith("/contact")) return "contact";
  if (path.startsWith("/customize")) return "customize";
  if (path.startsWith("/farmers/")) return "farmer";
  if (path.startsWith("/farmers")) return "farmers";
  if (path.startsWith("/launch-updates")) return "launch-updates";
  if (path.startsWith("/meal-kit-trust")) return "meal-kit-trust";
  if (path.startsWith("/membership")) return "membership";
  if (path.startsWith("/shop/")) {
    const slug = path.slice("/shop/".length).split(/[/?#]/)[0];
    if (slug && categorySlugs.includes(slug as typeof categorySlugs[number])) return "category";
    return "product";
  }
  if (path.startsWith("/shop")) return "shop";
  return path === "/" || path === "" ? "home" : "not-found";
}

function routePath(location: string): string {
  return location.startsWith("#") ? location.slice(1) : location;
}

export function getFarmerId(location: string): string | null {
  const path = routePath(location);
  if (!path.startsWith("/farmers/")) return null;
  const id = path.slice("/farmers/".length).split(/[/?#]/)[0];
  return id ? decodeURIComponent(id) : null;
}

export function getProductId(location: string): string | null {
  const path = routePath(location);
  if (!path.startsWith("/shop/")) return null;
  const slug = path.slice("/shop/".length).split(/[/?#]/)[0];
  if (!slug || categorySlugs.includes(slug as typeof categorySlugs[number])) return null;
  return slug;
}

export function getCategoryFromHash(location: string): string | null {
  const path = routePath(location);
  if (!path.startsWith("/shop/")) return null;
  const slug = path.slice("/shop/".length).split(/[/?#]/)[0];
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

export function navigateTo(path: string, replace = false) {
  if (typeof window === "undefined") return;
  const normalizedPath = path.startsWith("#/") ? path.slice(1) : path;
  const method = replace ? "replaceState" : "pushState";
  window.history[method](window.history.state, "", normalizedPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
