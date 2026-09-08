import type { ReactNode } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductIngredientInput } from "../../admin/admin-api";
import type { InventoryItemRow, InventoryRow, ProductRow, ProductSeasonalUpdateRow } from "../../cms/types";
import { categoryFieldConfig, type ProductFieldDef } from "./product-fields";

type ProductDetailProps = {
  product: ProductRow;
  ingredients: ProductIngredientInput[];
  ingredientsAvailable: boolean;
  inventoryItems: InventoryItemRow[];
  inventory: InventoryRow | null;
  stockAvailable: boolean;
  seasonalInfo?: ProductSeasonalUpdateRow | null;
  seasonalAvailable: boolean;
  onBack: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
};

function valueFor(product: ProductRow, field: ProductFieldDef): string {
  if (field.column) {
    const value = product[field.column];
    if (Array.isArray(value)) return value.join(", ");
    return value == null ? "" : String(value);
  }
  return product.details?.[field.detailKey ?? field.key] ?? "";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Thimphu",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function detailRow(label: string, value: ReactNode) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{label}</dt>
      <dd className="break-words text-brand-black">{value || "—"}</dd>
    </div>
  );
}

function DetailCard({ title, children, tone = "main", hint }: { title: string; children: ReactNode; tone?: "main" | "mint" | "yellow"; hint?: string }) {
  const tones = {
    main: "border-brand-forest bg-brand-white",
    mint: "border-brand-green-ink/40 bg-brand-mint/25",
    yellow: "border-brand-orange-ink/55 bg-brand-buff/45",
  };
  return (
    <section className={`grid gap-4 rounded-wobbly-card border-3 p-5 shadow-brand-soft ${tones[tone]}`}>
      <div className="grid gap-1">
        <h2 className="font-primary text-lg font-bold text-brand-green-ink">{title}</h2>
        {hint ? <p className="text-xs font-semibold text-brand-black/60">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProductDetail({
  product,
  ingredients,
  ingredientsAvailable,
  inventoryItems,
  inventory,
  stockAvailable,
  seasonalInfo,
  seasonalAvailable,
  onBack,
  onEdit,
  onToggleActive,
}: ProductDetailProps) {
  const categoryConfig = categoryFieldConfig(product.category);
  const categoryFields = categoryConfig?.fields ?? [];
  const itemById = new Map(inventoryItems.map((item) => [item.id, item]));
  const linkedIngredients = ingredients.map((ingredient) => {
    const item = itemById.get(ingredient.item_id);
    return `${item?.name ?? ingredient.item_id} · ${ingredient.quantity}${item?.unit ? ` ${item.unit}` : ""}`;
  });
  const healthBenefits = product.health_benefits.length > 0 ? product.health_benefits.join(", ") : "";
  const trustAllergens = product.trust_allergens.length > 0 ? product.trust_allergens.join(", ") : "";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <button className="w-fit text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4" type="button" onClick={onBack}>← Back to products</button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{product.name || "Unnamed product"}</h1>
            <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{product.id}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold ${product.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
            {product.published ? "Active" : "Inactive"}
          </span>
          <button className={btnOutlineSm} type="button" onClick={onToggleActive}>{product.published ? "Set inactive" : "Activate"}</button>
          <button className={btnPrimarySm} type="button" onClick={onEdit}>Edit product</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start">
        <div className="brand-pattern relative grid min-h-80 place-items-center overflow-hidden rounded-[30px_20px_34px_24px/22px_34px_20px_30px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-5 shadow-brand-big">
          {product.image ? <img className="h-72 w-full object-contain" src={product.image} alt={product.alt || product.name} /> : <div className="grid h-72 w-full place-items-center rounded-wobbly-md border-2 border-dashed border-brand-forest/25 text-sm font-bold text-brand-black/48">No product image added</div>}
          <span className="absolute left-6 top-6 rounded-full border-2 border-brand-forest bg-brand-yellow px-3 py-1 text-xs font-bold text-brand-black">{product.category || "Product"}</span>
        </div>
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {product.eyebrow ? <span className="rounded-full border-2 border-brand-orange-ink bg-brand-buff px-3 py-1 text-xs font-bold text-brand-orange-ink">{product.eyebrow}</span> : null}
            <span className="rounded-full border-2 border-brand-forest/25 bg-brand-mint px-3 py-1 text-xs font-bold text-brand-green-ink">{product.availability || "Availability not set"}</span>
          </div>
          <p className="text-lg leading-[1.55] text-brand-black/76">{product.description || "No product description added yet."}</p>
          <dl className="grid gap-3 sm:grid-cols-2">{detailRow("SKU", product.sku)}{detailRow("Category", product.category)}{detailRow("Price", product.price_amount == null ? "" : `Nu. ${product.price_amount}`)}{detailRow("Price unit", product.price_unit)}{detailRow("Delivery estimate", product.delivery_estimate)}{detailRow("Cooking time", product.cooking_time)}</dl>
        </div>
      </div>

      <DetailCard title="Product details" hint="The information customers see when they open this product." tone="mint">
        {categoryFields.length > 0 ? <dl className="grid gap-3 sm:grid-cols-2">{categoryFields.map((field) => detailRow(field.label, valueFor(product, field)))}</dl> : <p className="text-sm text-brand-black/64">No category-specific details have been added.</p>}
      </DetailCard>

      <DetailCard title="Contents & trust standards">
        <dl className="grid gap-3 sm:grid-cols-2">
          {detailRow("Ingredients", product.ingredients)}
          {detailRow("Linked inventory items", ingredientsAvailable ? (linkedIngredients.length > 0 ? linkedIngredients.join(", ") : "None linked") : "Inventory linking is not enabled")}
          {detailRow("Allergen notice", product.allergen_notice)}
          {detailRow("Storage", product.storage)}
          {detailRow("Nutrition", product.nutrition)}
          {detailRow("Source", product.source)}
          {detailRow("Health benefits", healthBenefits)}
          {detailRow("Trust allergens", trustAllergens)}
          {detailRow("Sourcing notes", product.sourcing)}
          {detailRow("Consultant note", product.consultant_note)}
          {detailRow("Dietician note", product.dietician_note)}
        </dl>
      </DetailCard>

      <DetailCard title="Stock & availability" tone="yellow">
        <dl className="grid gap-3 sm:grid-cols-3">
          {detailRow("Catalog status", product.published ? "Active" : "Inactive")}
          {detailRow("Tracked stock", stockAvailable ? (inventory?.stock_quantity == null ? "Not set" : String(inventory.stock_quantity)) : "Example stock")}
          {detailRow("Stock alert at", stockAvailable ? (inventory?.stock_alert_at == null ? "Not set" : String(inventory.stock_alert_at)) : "Not available")}
        </dl>
      </DetailCard>

      <DetailCard title="Seasonal update" hint="The latest product-specific seasonal note shown on the public product page." tone="mint">
        {seasonalAvailable ? (
          seasonalInfo ? <div className="grid gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{seasonalInfo.season}</span><span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${seasonalInfo.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>{seasonalInfo.published ? "Published" : "Draft"}</span></div><p className="text-brand-black">{seasonalInfo.content || "—"}</p></div> : <p className="text-sm text-brand-black/64">No seasonal update added yet. Use Edit product to add one.</p>
        ) : <p className="text-sm text-brand-black/64">Product seasonal updates are not enabled. Apply <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/product-seasonal-updates-schema.sql</code> to enable them.</p>}
      </DetailCard>

      <DetailCard title="Publishing & member access">
        <dl className="grid gap-3 sm:grid-cols-2">
          {detailRow("Tags", product.tags.join(", "))}
          {detailRow("Collections", product.collections.join(", "))}
          {detailRow("Sort order", String(product.sort_order))}
          {detailRow("Member access starts", formatDateTime(product.member_early_access_starts_at))}
          {detailRow("Public release", formatDateTime(product.member_early_access_ends_at))}
          {detailRow("Image alt text", product.alt)}
        </dl>
      </DetailCard>

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="button" onClick={onEdit}>Edit product</button>
        <button className={btnOutlineSm} type="button" onClick={onBack}>Back to products</button>
      </div>
    </div>
  );
}
