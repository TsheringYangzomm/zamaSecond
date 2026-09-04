import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseClient } from "../supabase";

import {
  defaultBlocks,
  type ContentBlocks,
} from "../data/content-blocks";

import { shopProducts, mealKitTrustDetails, type MealKitTrustDetail } from "../data/landing";

import {
  farmers as defaultFarmers,
  type Farmer,
} from "../data/farmers";

import {
  defaultDieticians,
  type Dietician,
} from "../data/dieticians";

import {
  reviewsByProduct as defaultReviews,
  type Review,
} from "../components/shop/reviews";

import type { ShopProduct } from "../components/shop/shop-utils";

import {
  mapDieticianRow,
  mapFarmerRow,
  mapProductRow,
  mapReviewRow,
} from "./map-rows";

import type {
  ContentBlockRow,
  DieticianRow,
  FarmerRow,
  FarmerSeasonalUpdateRow,
  FarmerStoryRow,
  ProductRow,
  ReviewRow,
} from "./types";

import type { BoxContents } from "../components/shop/shop-utils";

export type ContentStatus = "static" | "remote" | "error";

export type Content = {
  blocks: ContentBlocks;
  products: readonly ShopProduct[];
  farmers: readonly Farmer[];
  dieticians: readonly Dietician[];
  reviews: Readonly<Record<string, readonly Review[]>>;
  mealKitTrustDetails: readonly MealKitTrustDetail[];
  status: ContentStatus;
};

type RemoteContent = {
  blocks?: Partial<ContentBlocks>;
  products?: readonly ShopProduct[];
  farmers?: readonly Farmer[];
  dieticians?: readonly Dietician[];
  reviews?: Readonly<Record<string, readonly Review[]>>;
  mealKitTrustDetails?: readonly MealKitTrustDetail[];
  status: ContentStatus;
};

export const staticContent: Content = {
  blocks: defaultBlocks,
  products: shopProducts,
  farmers: defaultFarmers,
  dieticians: defaultDieticians,
  reviews: defaultReviews,
  mealKitTrustDetails,
  status: "static",
};

function groupReviews(
  rows: ReviewRow[],
): Record<string, Review[]> {
  const grouped: Record<string, Review[]> = {};

  for (const row of rows) {
    const reviews = (grouped[row.product_id] ??= []);
    reviews.push(mapReviewRow(row));
  }

  return grouped;
}

function isBlockRow(
  value: unknown,
): value is ContentBlockRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ContentBlockRow).key === "string"
  );
}

function deriveTrustDetails(
  products: readonly ShopProduct[],
): MealKitTrustDetail[] {
  return products
    .filter(
      (product) =>
        product.category === "Meal kits" &&
        product.active !== false,
    )
    .map((product) => ({
      slug: product.id,
      title: product.name,
      image: product.image,
      alt: product.alt,
      consultantNote: product.consultantNote ?? "",
      dieticianNote: product.dieticianNote ?? "",
      healthBenefits: product.healthBenefits ?? [],
      allergens: product.trustAllergens ?? [],
      sourcing: product.sourcing ?? "",
      storageAdvice: product.storage,
    }));
}

async function loadRemoteContent(): Promise<RemoteContent> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      status: "static",
    };
  }

  let products: readonly ShopProduct[] | undefined;
  let farmers: readonly Farmer[] | undefined;
  let dieticians: readonly Dietician[] | undefined;
  let reviews:
    | Readonly<Record<string, readonly Review[]>>
    | undefined;
  let trustDetails: readonly MealKitTrustDetail[] | undefined;

  let blocks: Partial<ContentBlocks> | undefined;

  let hadError = false;

  const [
    productResult,
    farmerResult,
    dieticianResult,
    reviewResult,
    blockResult,
    storyResult,
    seasonalResult,
    ingredientResult,
    itemResult,
  ] = await Promise.all([
    client
      .from("products")
      .select("*")
      .order("sort_order", {
        ascending: true,
      }),

    client
      .from("farmers")
      .select("*")
      .eq("published", true)
      .order("sort_order", {
        ascending: true,
      }),

    client
      .from("dieticians")
      .select("*")
      .eq("published", true)
      .order("sort_order", {
        ascending: true,
      }),

    client
      .from("reviews")
      .select("*")
      .eq("published", true),

    client
      .from("content_blocks")
      .select("*"),

    client
      .from("farmer_stories")
      .select("*")
      .eq("published", true),

    client
      .from("farmer_seasonal_updates")
      .select("*")
      .eq("published", true)
      .order("season", {
        ascending: false,
      }),

    client
      .from("product_ingredients")
      .select("product_id, item_id, quantity"),

    client
      .from("inventory_items")
      .select("id, name, unit"),
  ]);

  /* ================================
     PRODUCTS
  ================================= */

  if (
    !productResult.error &&
    productResult.data &&
    productResult.data.length > 0
  ) {
    const itemById = new Map<string, { name: string; unit: string }>();
    if (!itemResult.error && itemResult.data) {
      for (const row of itemResult.data as { id: string; name: string; unit: string }[]) {
        itemById.set(row.id, { name: row.name, unit: row.unit });
      }
    }

    const contentsByProduct = new Map<string, BoxContents[]>();
    if (!ingredientResult.error && ingredientResult.data) {
      for (const row of ingredientResult.data as { product_id: string; item_id: string; quantity: number }[]) {
        const item = itemById.get(row.item_id);
        if (!item) continue;
        const quantity = Number(row.quantity) || 0;
        if (quantity <= 0) continue;
        const qtyText = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
        const entry: BoxContents = { name: item.name, quantity: `${qtyText} ${item.unit}`.trim() };
        const list = contentsByProduct.get(row.product_id);
        if (list) list.push(entry);
        else contentsByProduct.set(row.product_id, [entry]);
      }
    }

    products = (
      productResult.data as unknown as ProductRow[]
    ).map((row) => mapProductRow(row, contentsByProduct.get(row.id) ?? []));
  } else if (productResult.error) {
    hadError = true;
  }

  /* ================================
     FARMERS
  ================================= */

  if (
    !farmerResult.error &&
    farmerResult.data &&
    farmerResult.data.length > 0
  ) {
    const storyByFarmer = new Map<string, string>();
    for (const row of (storyResult.data ?? []) as FarmerStoryRow[]) {
      if (row.content && !storyByFarmer.has(row.farmer_id)) {
        storyByFarmer.set(row.farmer_id, row.content);
      }
    }

    const seasonalByFarmer = new Map<string, string>();
    for (const row of (seasonalResult.data ?? []) as FarmerSeasonalUpdateRow[]) {
      if (row.content && !seasonalByFarmer.has(row.farmer_id)) {
        seasonalByFarmer.set(row.farmer_id, row.content);
      }
    }

    const storyTableFailed = Boolean(storyResult.error);
    const seasonalTableFailed = Boolean(seasonalResult.error);

    const defaultFarmerById = new Map<string, Farmer>(
      defaultFarmers.map(
        (farmer) => [farmer.id, farmer] as [string, Farmer],
      ),
    );

    farmers = (
      farmerResult.data as unknown as FarmerRow[]
    ).map((row) => {
      const mapped = mapFarmerRow(row);
      const fallback = defaultFarmerById.get(row.id);
      const story =
        storyByFarmer.get(row.id) ??
        (storyTableFailed ? fallback?.story : undefined);
      const seasonalUpdate =
        seasonalByFarmer.get(row.id) ??
        (seasonalTableFailed ? fallback?.seasonalUpdate : undefined);
      return story === undefined && seasonalUpdate === undefined
        ? mapped
        : {
            ...mapped,
            ...(story === undefined ? {} : { story }),
            ...(seasonalUpdate === undefined ? {} : { seasonalUpdate }),
          };
    });
  } else if (farmerResult.error) {
    hadError = true;
  }

  /* ================================
     DIETICIANS
  ================================= */

  if (
    !dieticianResult.error &&
    dieticianResult.data &&
    dieticianResult.data.length > 0
  ) {
    const defaultDieticianById = new Map<string, Dietician>(
      defaultDieticians.map(
        (dietician) => [dietician.id, dietician] as [string, Dietician],
      ),
    );
    dieticians = (
      dieticianResult.data as unknown as DieticianRow[]
    ).map((row) => {
      const mapped = mapDieticianRow(row);
      const fallback = defaultDieticianById.get(row.id);
      return fallback && !mapped.image ? { ...mapped, image: fallback.image } : mapped;
    });
  } else if (dieticianResult.error) {
    hadError = true;
  }

  /* ================================
     REVIEWS
  ================================= */

  if (
    !reviewResult.error &&
    reviewResult.data &&
    reviewResult.data.length > 0
  ) {
    reviews = groupReviews(
      reviewResult.data as unknown as ReviewRow[],
    );
  } else if (reviewResult.error) {
    hadError = true;
  }

  /* ================================
     CONTENT BLOCKS
  ================================= */

  if (!blockResult.error && blockResult.data) {
    const rows = blockResult.data.filter(isBlockRow);

    if (rows.length > 0) {
      blocks = {};

      for (const row of rows) {
        (blocks as Record<string, unknown>)[row.key] =
          row.value;
      }
    }
  } else if (blockResult.error) {
    hadError = true;
  }

  /* ================================
     MEAL KIT TRUST DETAILS
  ================================= */

  if (products !== undefined) {
    const derived = deriveTrustDetails(products);
    if (derived.length > 0) {
      trustDetails = derived;
    }
  }

  const usedRemote =
    products !== undefined ||
    farmers !== undefined ||
    dieticians !== undefined ||
    reviews !== undefined ||
    blocks !== undefined ||
    trustDetails !== undefined;

  return {
    products,
    farmers,
    dieticians,
    reviews,
    blocks,
    mealKitTrustDetails: trustDetails,
    status: usedRemote
      ? "remote"
      : hadError
        ? "error"
        : "static",
  };
}

/* =========================================================
   MERGE CONTENT
========================================================= */

function mergeContent(
  base: Content,
  remote: RemoteContent,
): Content {
  let mergedBlocks = base.blocks;

  if (remote.blocks) {
    mergedBlocks = {
      ...base.blocks,
      ...remote.blocks,
    };

    /*
     * IMPORTANT:
     *
     * The nav block is nested.
     * A shallow spread would replace the entire
     * default nav object if Supabase contains only
     * some nav properties.
     *
     * Merge the nav object separately so that
     * missing properties such as `items` are preserved.
     */

    if (remote.blocks.nav) {
      mergedBlocks = {
        ...mergedBlocks,

        nav: {
          ...base.blocks.nav,
          ...remote.blocks.nav,
        },
      };
    }
  }

  return {
    blocks: mergedBlocks,

    products:
      remote.products ?? base.products,

    farmers:
      remote.farmers ?? base.farmers,

    dieticians:
      remote.dieticians ?? base.dieticians,

    reviews:
      remote.reviews ?? base.reviews,

    mealKitTrustDetails:
      remote.mealKitTrustDetails ?? base.mealKitTrustDetails,

    status: remote.status,
  };
}

/* =========================================================
   CONTEXT
========================================================= */

const ContentContext =
  createContext<Content>(staticContent);

/* =========================================================
   PROVIDER
========================================================= */

export function ContentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [content, setContent] =
    useState<Content>(staticContent);

  useEffect(() => {
    let cancelled = false;

    loadRemoteContent().then((remote) => {
      if (cancelled) return;

      setContent(
        mergeContent(
          staticContent,
          remote,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useContent(): Content {
  return useContext(ContentContext);
}