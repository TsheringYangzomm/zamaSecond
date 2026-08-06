import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../supabase";
import { defaultBlocks, type ContentBlocks } from "../data/content-blocks";
import { shopProducts } from "../data/landing";
import { farmers as defaultFarmers, type Farmer } from "../data/farmers";
import { reviewsByProduct as defaultReviews, type Review } from "../components/shop/reviews";
import type { ShopProduct } from "../components/shop/shop-utils";
import { mapFarmerRow, mapProductRow, mapReviewRow } from "./map-rows";
import type { ContentBlockRow, FarmerRow, ProductRow, ReviewRow } from "./types";

export type ContentStatus = "static" | "remote" | "error";

export type Content = {
  blocks: ContentBlocks;
  products: readonly ShopProduct[];
  farmers: readonly Farmer[];
  reviews: Readonly<Record<string, readonly Review[]>>;
  status: ContentStatus;
};

type RemoteContent = {
  blocks?: Partial<ContentBlocks>;
  products?: readonly ShopProduct[];
  farmers?: readonly Farmer[];
  reviews?: Readonly<Record<string, readonly Review[]>>;
  status: ContentStatus;
};

export const staticContent: Content = {
  blocks: defaultBlocks,
  products: shopProducts,
  farmers: defaultFarmers,
  reviews: defaultReviews,
  status: "static",
};

function groupReviews(rows: ReviewRow[]): Record<string, Review[]> {
  const grouped: Record<string, Review[]> = {};
  for (const row of rows) {
    const reviews = (grouped[row.product_id] ??= []);
    reviews.push(mapReviewRow(row));
  }
  return grouped;
}

function isBlockRow(value: unknown): value is ContentBlockRow {
  return typeof value === "object" && value !== null && typeof (value as ContentBlockRow).key === "string";
}

async function loadRemoteContent(): Promise<RemoteContent> {
  const client = getSupabaseClient();
  if (!client) return { status: "static" };

  let products: readonly ShopProduct[] | undefined;
  let farmers: readonly Farmer[] | undefined;
  let reviews: Readonly<Record<string, readonly Review[]>> | undefined;
  let blocks: Partial<ContentBlocks> | undefined;
  let hadError = false;

  const [productResult, farmerResult, reviewResult, blockResult] = await Promise.all([
    client.from("products").select("*").eq("published", true).order("sort_order", { ascending: true }),
    client.from("farmers").select("*").eq("published", true).order("sort_order", { ascending: true }),
    client.from("reviews").select("*").eq("published", true),
    client.from("content_blocks").select("*"),
  ]);

  if (!productResult.error && productResult.data && productResult.data.length > 0) {
    products = (productResult.data as unknown as ProductRow[]).map(mapProductRow);
  } else if (productResult.error) {
    hadError = true;
  }

  if (!farmerResult.error && farmerResult.data && farmerResult.data.length > 0) {
    farmers = (farmerResult.data as unknown as FarmerRow[]).map(mapFarmerRow);
  } else if (farmerResult.error) {
    hadError = true;
  }

  if (!reviewResult.error && reviewResult.data && reviewResult.data.length > 0) {
    reviews = groupReviews(reviewResult.data as unknown as ReviewRow[]);
  } else if (reviewResult.error) {
    hadError = true;
  }

  if (!blockResult.error && blockResult.data) {
    const rows = blockResult.data.filter(isBlockRow);
    if (rows.length > 0) {
      blocks = {};
      for (const row of rows) {
        (blocks as Record<string, unknown>)[row.key] = row.value;
      }
    }
  } else if (blockResult.error) {
    hadError = true;
  }

  const usedRemote = products !== undefined || farmers !== undefined || reviews !== undefined || blocks !== undefined;
  return { products, farmers, reviews, blocks, status: usedRemote ? "remote" : hadError ? "error" : "static" };
}

function mergeContent(base: Content, remote: RemoteContent): Content {
  return {
    blocks: remote.blocks ? { ...base.blocks, ...remote.blocks } : base.blocks,
    products: remote.products ?? base.products,
    farmers: remote.farmers ?? base.farmers,
    reviews: remote.reviews ?? base.reviews,
    status: remote.status,
  };
}

const ContentContext = createContext<Content>(staticContent);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(staticContent);

  useEffect(() => {
    let cancelled = false;
    loadRemoteContent().then((remote) => {
      if (cancelled) return;
      setContent(mergeContent(staticContent, remote));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): Content {
  return useContext(ContentContext);
}
