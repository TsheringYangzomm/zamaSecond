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

export type InventoryRow = {
  product_id: string;
  stock_quantity: number | null;
  stock_alert_at: number | null;
  updated_at?: string;
};

export type InventoryItemRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  supplier: string;
  stock_quantity: number | null;
  stock_alert_at: number | null;
  updated_at?: string;
};

export type InventoryStockHistoryRow = {
  id: string;
  item_id: string;
  quantity_change: number;
  reason: string;
  reference: string;
  admin_email: string;
  created_at: string;
};

export type InventoryStockLotRow = {
  id: string;
  item_id: string;
  supplier: string;
  quantity: number | null;
  remaining: number | null;
  received_date: string;
  unit_cost: number | null;
  batch_reference: string;
  notes: string;
  created_at: string;
};

export type ProductIngredientRow = {
  product_id: string;
  item_id: string;
  quantity: number;
  created_at?: string;
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

export type FarmerPrivateInfoRow = {
  farmer_id: string;
  village: string;
  farm_size: string;
  farming_practices: string;
  contact_phone: string;
  contact_email: string;
  alternative_contact: string;
  preferred_contact_method: string;
  admin_notes: string;
  created_at?: string;
  updated_at?: string;
};

export type FarmerStoryRow = {
  farmer_id: string;
  content: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
};

export type FarmerSeasonalUpdateRow = {
  farmer_id: string;
  season: string;
  content: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
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

export type MealKitTrustDetailRow = {
  slug: string;
  title: string;
  image: string;
  alt: string;
  consultant_note: string;
  dietician_note: string;
  health_benefits: string[];
  allergens: string[];
  sourcing: string;
  storage_advice: string;
  sort_order: number;
  published: boolean;
};
