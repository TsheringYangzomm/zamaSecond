export type Route = "home" | "contact" | "shop" | "product";

export function getRoute(hash: string): Route {
  if (hash.startsWith("#/contact")) return "contact";
  if (hash.startsWith("#/shop/")) return "product";
  if (hash.startsWith("#/shop")) return "shop";
  return "home";
}

export function getProductId(hash: string): string | null {
  if (!hash.startsWith("#/shop/")) return null;
  const id = hash.slice("#/shop/".length).split(/[/?#]/)[0];
  return id || null;
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
