export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  eyebrow: string;
  description: string;
  image: string;
  alt: string;
  category: string;
  price_amount: number | null;
  price_unit: string;
  servings: string;
  availability: string;
  delivery_estimate: string;
  cooking_time: string;
  ingredients: string;
  allergen_notice: string;
  storage: string;
  source: string;
  nutrition: string;
  tags: string[];
  collections: string[];
  sort_order: number;
  published: boolean;
};

export type FarmerRow = {
  id: string;
  name: string;
  location: string;
  dzongkhag: string;
  products: string[];
  tags: string[];
  years_farming: number;
  bio: string;
  verified: boolean;
  partner_since: number | null;
  image: string;
  sort_order: number;
  published: boolean;
};

export type ReviewRow = {
  id: string;
  product_id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
  sort_order: number;
  published: boolean;
};

export type ContentBlockRow = {
  key: string;
  value: Record<string, unknown>;
  updated_at?: string;
};
