import type { ProductRow } from "../../cms/types";

export type ProductFieldType = "text" | "textarea" | "number" | "select" | "chips" | "multiselect";

export type ProductFieldSection = "basic" | "pricing" | "availability";

export type ProductFieldDef = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  type?: ProductFieldType;
  column?: keyof ProductRow;
  detailKey?: string;
  options?: readonly string[];
  fullWidth?: boolean;
  required?: boolean;
  section?: ProductFieldSection;
};

export type ProductCategoryCommonOverride = {
  label?: string;
  hint?: string;
};

export type ProductCategoryFieldConfig = {
  value: string;
  label: string;
  fields: ProductFieldDef[];
  showIngredients?: boolean;
  showTrustStandards?: boolean;
  commonOverrides?: Record<string, ProductCategoryCommonOverride>;
};

export const commonProductFieldDefs: ProductFieldDef[] = [
  {
    key: "name",
    label: "Name",
    hint: "The name customers see, e.g. Chef's Vegetable Box.",
    column: "name",
    required: true,
    section: "basic",
  },
  {
    key: "sku",
    label: "SKU",
    hint: "Your internal code for tracking this item, e.g. VBX-001. Can be left blank.",
    column: "sku",
    section: "basic",
  },
  {
    key: "eyebrow",
    label: "Badge / eyebrow line",
    hint: "A short label shown above the name, e.g. Chef's pick or Seasonal.",
    column: "eyebrow",
    section: "basic",
  },
  {
    key: "description",
    label: "Description",
    hint: "A short paragraph selling the product, shown on its card and page.",
    column: "description",
    type: "textarea",
    fullWidth: true,
    section: "basic",
  },
  {
    key: "price",
    label: "Price (Nu.)",
    hint: "Leave blank for a price listed later.",
    column: "price_amount",
    type: "number",
    section: "pricing",
  },
  {
    key: "priceUnit",
    label: "Price unit",
    hint: "e.g. / box, / 500g",
    column: "price_unit",
    section: "pricing",
  },
  {
    key: "availabilityStatus",
    label: "Availability status",
    hint: "e.g. In stock, Pre-order, or Sold out for the season.",
    column: "availability",
    section: "availability",
  },
  {
    key: "availabilityNote",
    label: "Availability description",
    hint: "More detail about when it's available, e.g. Fresh every Friday — order by Thursday.",
    detailKey: "availability_note",
    type: "textarea",
    fullWidth: true,
    section: "availability",
  },
];

export const productCategoryFieldConfigs: ProductCategoryFieldConfig[] = [
  {
    value: "Vegetables",
    label: "Vegetable details",
    fields: [
      {
        key: "variety",
        label: "Variety",
        hint: "The specific cultivar, e.g. Local red onion or Hybrid tomato.",
        detailKey: "variety",
      },
      {
        key: "farmerSource",
        label: "Farmer / source",
        hint: "Where it comes from, e.g. Grown by Pema Dorji in Punakha.",
        column: "source",
      },
      {
        key: "origin",
        label: "Origin",
        hint: "e.g. Punakha, Paro, or Wangdue Phodrang.",
        detailKey: "origin",
      },
      {
        key: "harvestInfo",
        label: "Harvest information",
        hint: "e.g. Harvested fresh each week.",
        detailKey: "harvest_info",
        type: "textarea",
        fullWidth: true,
      },
      {
        key: "seasonality",
        label: "Seasonality",
        hint: "When it's in season, e.g. October to March.",
        detailKey: "seasonality",
      },
      {
        key: "weightUnit",
        label: "Weight / unit",
        hint: "How it's sold, e.g. 1 kg bag or per bunch.",
        detailKey: "weight_unit",
      },
      {
        key: "storage",
        label: "Storage information",
        hint: "How customers should keep it, e.g. Keep refrigerated and use within 3 days.",
        column: "storage",
      },
    ],
  },
  {
    value: "Fruits",
    label: "Fruit details",
    fields: [
      {
        key: "variety",
        label: "Variety",
        hint: "The specific cultivar, e.g. Honeycrisp apple or Local peach.",
        detailKey: "variety",
      },
      {
        key: "farmerSource",
        label: "Farmer / source",
        hint: "Where it comes from, e.g. Grown by Kinley Tshering in Haa.",
        column: "source",
      },
      {
        key: "origin",
        label: "Origin",
        hint: "e.g. Haa, Paro, or Mongar.",
        detailKey: "origin",
      },
      {
        key: "seasonality",
        label: "Seasonality",
        hint: "When it's in season, e.g. Autumn harvest.",
        detailKey: "seasonality",
      },
      {
        key: "weightUnit",
        label: "Weight / unit",
        hint: "How it's sold, e.g. 2 kg box or per piece.",
        detailKey: "weight_unit",
      },
      {
        key: "storage",
        label: "Storage information",
        hint: "How customers should keep it, e.g. Keep cool and dry.",
        column: "storage",
      },
    ],
  },
  {
    value: "Meal kits",
    label: "Meal kit details",
    fields: [
      {
        key: "cuisine",
        label: "Cuisine",
        hint: "The main cuisine of the meal kit.",
        placeholder: "Select cuisine…",
        detailKey: "cuisine",
        type: "select",
        required: true,
        options: ["Bhutanese", "Asian", "Chinese", "Indian", "Italian", "Continental", "Western"],
      },
      {
        key: "servings",
        label: "Servings",
        hint: "How many people it feeds, e.g. 2 or 2–3.",
        column: "servings",
        required: true,
      },
      {
        key: "cookingTime",
        label: "Cooking time",
        hint: "e.g. 25 minutes, or No cooking needed.",
        column: "cooking_time",
      },
      {
        key: "difficulty",
        label: "Difficulty",
        hint: "How hard the recipe is to cook.",
        placeholder: "Select difficulty…",
        detailKey: "difficulty",
        type: "select",
        required: true,
        options: ["Easy", "Medium", "Hard"],
      },
      {
        key: "dietaryTags",
        label: "Dietary tags",
        hint: "Pick all that apply.",
        column: "tags",
        type: "chips",
        options: ["Vegetarian", "Vegan", "Gluten-free"],
      },
      {
        key: "allergens",
        label: "Allergens",
        hint: "Pick all that apply. Leave empty if there are none.",
        placeholder: "Select allergens…",
        column: "allergen_notice",
        type: "multiselect",
        options: ["Eggs", "Milk", "Fish", "Crustacean shellfish", "Tree nuts", "Peanuts", "Wheat", "Gluten", "Soy", "Sesame", "Mustard", "Sulphites"],
      },
      {
        key: "recipe",
        label: "Recipe / instructions",
        hint: "Cooking steps or prep notes customers will follow.",
        detailKey: "recipe",
        type: "textarea",
        fullWidth: true,
      },
    ],
    showIngredients: true,
    showTrustStandards: true,
  },
  {
    value: "Custom boxes",
    label: "Box details",
    fields: [
      {
        key: "boxType",
        label: "Box type",
        hint: "What kind of box this is.",
        placeholder: "Select box type…",
        detailKey: "box_type",
        type: "select",
        required: true,
        options: ["Veggie Box", "Fruit Box", "Grocery Box", "Mixed Box", "Seasonal Box", "Custom Box"],
      },
      {
        key: "boxItemCount",
        label: "Number of items",
        hint: "How many items are included, e.g. 8.",
        detailKey: "box_item_count",
        type: "number",
      },
    ],
    showIngredients: true,
    commonOverrides: {
      description: {
        label: "Box description (optional)",
        hint: "A short summary of what's inside the box.",
      },
    },
  },
  {
    value: "Groceries",
    label: "Grocery details",
    fields: [
      {
        key: "brand",
        label: "Brand",
        hint: "e.g. Green Diamond, Druk, or Local.",
        detailKey: "brand",
      },
      {
        key: "sizeQuantity",
        label: "Size / quantity",
        hint: "e.g. 500 g pack or 1 kg bag.",
        detailKey: "size_quantity",
      },
      {
        key: "ingredients",
        label: "Ingredients",
        hint: "List of ingredients, e.g. Wholegrain oats, Raisins.",
        column: "ingredients",
        type: "textarea",
        fullWidth: true,
      },
      {
        key: "allergens",
        label: "Allergens",
        hint: "Warn about anything, e.g. May contain traces of nuts.",
        column: "allergen_notice",
      },
      {
        key: "storage",
        label: "Storage information",
        hint: "How customers should keep it, e.g. Store in a cool, dry place.",
        column: "storage",
      },
      {
        key: "expiryInfo",
        label: "Expiry information (if applicable)",
        hint: "Best-before or expiry guidance, e.g. Best before 6 months from packing.",
        detailKey: "expiry_info",
        type: "textarea",
        fullWidth: true,
      },
    ],
  },
  {
    value: "Household Essentials",
    label: "Household essentials details",
    fields: [
      {
        key: "brand",
        label: "Brand",
        hint: "e.g. Joy, Trust, or Local.",
        detailKey: "brand",
      },
      {
        key: "householdType",
        label: "Product type",
        hint: "e.g. Detergent, Cleaner, or Soap.",
        detailKey: "household_type",
      },
      {
        key: "householdSize",
        label: "Size",
        hint: "e.g. 1 L, 500 ml, or 250 g.",
        detailKey: "household_size",
      },
      {
        key: "householdQuantity",
        label: "Quantity",
        hint: "Pieces per pack, e.g. 2 or 1.",
        detailKey: "household_quantity",
      },
      {
        key: "materialType",
        label: "Material / type (where applicable)",
        hint: "e.g. Stainless steel, Plastic-free, or FSC-certified paper.",
        detailKey: "material_type",
        type: "textarea",
        fullWidth: true,
      },
      {
        key: "usageInfo",
        label: "Usage information",
        hint: "How customers should use it, e.g. Dilute before use.",
        detailKey: "usage_info",
        type: "textarea",
        fullWidth: true,
      },
    ],
  },
  {
    value: "Other",
    label: "Other details",
    fields: [],
  },
];

export function categoryFieldConfig(value: string): ProductCategoryFieldConfig | undefined {
  return productCategoryFieldConfigs.find((config) => config.value === value);
}