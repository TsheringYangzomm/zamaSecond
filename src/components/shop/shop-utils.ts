import { shopProducts } from "../../data/landing";

export { shopProducts };

export type ProductCategory = "Vegetables" | "Fruits" | "Meal kits" | "Groceries" | "Custom boxes";

export type BoxContents = {
  name: string;
  quantity: string;
};

export type ShopProduct = {
  id: string;
  sku: string;
  name: string;
  eyebrow: string;
  description: string;
  image: string;
  alt: string;
  category: ProductCategory;
  priceAmount: number | null;
  priceLabel: string;
  priceUnit: string;
  servings: string;
  availability: string;
  deliveryEstimate: string;
  cookingTime: string;
  ingredients: string;
  allergenNotice: string;
  storage: string;
  source: string;
  nutrition: string;
  tags: readonly string[];
  collections: readonly string[];
  contents: readonly BoxContents[];
};

export const categories = ["All", "Vegetables", "Fruits", "Meal kits", "Groceries", "Custom boxes"] as const;
export type Category = (typeof categories)[number];

export const categoryBadgeClasses: Record<ProductCategory, string> = {
  Vegetables: "bg-brand-lime text-brand-forest",
  Fruits: "bg-brand-orange/18 text-brand-orange-ink",
  "Meal kits": "bg-brand-purple text-brand-white",
  Groceries: "bg-brand-buff text-brand-forest",
  "Custom boxes": "bg-brand-mint text-brand-forest",
};

export const categoryRailClasses: Record<ProductCategory, string> = {
  Vegetables: "border-t-brand-leaf",
  Fruits: "border-t-brand-orange",
  "Meal kits": "border-t-brand-purple",
  Groceries: "border-t-brand-yellow",
  "Custom boxes": "border-t-brand-green-ink",
};

export const numberFormatter = new Intl.NumberFormat("en-BT", { maximumFractionDigits: 0 });

export function categorySlug(category: Category) {
  return category.toLowerCase().replaceAll(" ", "-");
}

export const categorySlugs = ["vegetables", "fruits", "meal-kits", "groceries", "custom-boxes"] as const;

export function slugToCategory(slug: string): Category | null {
  return categories.find((c) => categorySlug(c) === slug) ?? null;
}

export type ShopFilter = {
  slug: string;
  label: string;
  matches: (product: ShopProduct) => boolean;
};

export const shopFilters: ShopFilter[] = [
  { slug: "top-pick", label: "Top picks", matches: (product) => product.collections.includes("top-pick") },
  { slug: "new", label: "New arrivals", matches: (product) => product.collections.includes("new") },
  { slug: "frequent", label: "Frequently bought", matches: (product) => product.collections.includes("frequent") },
  { slug: "time-saver", label: "Time saver", matches: (product) => product.collections.includes("time-saver") },
  { slug: "veggie", label: "Veggies only", matches: (product) => product.collections.includes("veggie") },
  { slug: "bundle", label: "Bundles & sets", matches: (product) => product.collections.includes("bundle") },
  { slug: "under-500", label: "Under Nu. 500", matches: (product) => product.priceAmount !== null && product.priceAmount < 500 },
];

function readQueryParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  const hashQuery = window.location.hash.slice(1).split("?")[1] ?? "";
  const searchQuery = window.location.search.replace(/^\?/, "");
  return new URLSearchParams(hashQuery).get(key) ?? new URLSearchParams(searchQuery).get(key);
}

function writeQueryParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  const [path, queryString = ""] = window.location.hash.slice(1).split("?");
  const params = new URLSearchParams(queryString);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  window.history.replaceState(window.history.state, "", `#${path}${query ? `?${query}` : ""}`);
}

export function getInitialCategory(): Category {
  const requestedCategory = readQueryParam("category");
  return categories.find((category) => categorySlug(category) === requestedCategory) ?? "All";
}

export function setCategoryInUrl(category: Category) {
  writeQueryParam("category", category === "All" ? null : categorySlug(category));
}

export function getInitialFilter(): string {
  const requested = readQueryParam("filter");
  return requested !== null && shopFilters.some((filter) => filter.slug === requested) ? requested : "All";
}

export function setFilterInUrl(filter: string) {
  writeQueryParam("filter", filter === "All" ? null : filter);
}

export function productPrice(product: ShopProduct) {
  return product.priceAmount === null ? product.priceLabel : `Nu. ${numberFormatter.format(product.priceAmount)} ${product.priceUnit}`;
}

export function findProduct(products: readonly ShopProduct[], productId: string): ShopProduct | undefined {
  return products.find((product) => product.id === productId);
}

export function productDetailHref(product: ShopProduct) {
  return `#/shop/${product.id}`;
}
