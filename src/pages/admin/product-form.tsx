import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductIngredientInput } from "../../admin/admin-api";
import type { InventoryItemRow, ProductRow } from "../../cms/types";
import { Checkbox, Field, ImagePicker, selectClasses, TextArea, TextInput } from "./admin-fields";
import { productCategoryOptions } from "./product-category-picker";
import { InventoryItemPickerDialog } from "./inventory-item-picker-dialog";
import { categoryFieldConfig, commonProductFieldDefs, type ProductFieldDef } from "./product-fields";

export function blankProduct(id: string): ProductRow {
  return {
    id,
    sku: "",
    name: "",
    eyebrow: "",
    description: "",
    image: "",
    alt: "",
    category: "Vegetables",
    details: {},
    price_amount: null,
    price_unit: "",
    servings: "",
    availability: "",
    delivery_estimate: "",
    cooking_time: "",
    ingredients: "",
    allergen_notice: "",
    storage: "",
    source: "",
    nutrition: "",
    tags: [],
    collections: [],
    consultant_note: "",
    dietician_note: "",
    health_benefits: [],
    trust_allergens: [],
    sourcing: "",
    sort_order: 0,
    published: true,
  };
}

type ProductDraft = Omit<ProductRow, "price_amount" | "tags" | "collections"> & {
  price_amount: string;
  tags: string;
  collections: string;
  details: Record<string, string>;
};

type IngredientDraft = {
  item_id: string;
  quantity: string;
};

type FieldErrorMap = Record<string, string>;

type IngredientRowError = {
  quantity?: string;
};

function toDraft(row: ProductRow): ProductDraft {
  return {
    ...row,
    price_amount: row.price_amount == null ? "" : String(row.price_amount),
    tags: row.tags.join(", "),
    collections: row.collections.join(", "),
    details: row.details ?? {},
  };
}

function fromDraft(draft: ProductDraft): ProductRow {
  const parsedPrice = Number(draft.price_amount.trim());
  return {
    ...draft,
    price_amount: draft.price_amount.trim() === "" || Number.isNaN(parsedPrice) ? null : parsedPrice,
    tags: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
    collections: draft.collections.split(",").map((item) => item.trim()).filter(Boolean),
  };
}

const categories = productCategoryOptions.map((option) => option.value);

function toStringList(value: readonly string[]): string {
  return value.join(", ");
}

function fromStringList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function fieldValue(draft: ProductDraft, def: ProductFieldDef): string {
  if (def.column) {
    const value = draft[def.column as keyof ProductDraft];
    return Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  }
  return draft.details[def.detailKey ?? def.key] ?? "";
}

function splitList(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function listJoin(values: string[]): string {
  return values.join(", ");
}

function toggleListItem(current: string[], item: string): string[] {
  return current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];
}

const chipClasses =
  "touch-manipulation rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors duration-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";
const chipActive = "border-brand-forest bg-brand-leaf text-brand-white";
const chipInactive = "border-brand-forest/40 bg-brand-white text-brand-black hover:border-brand-forest hover:bg-brand-mint";

function MultiSelectField({ def, label, values, onChange, error }: {
  def: ProductFieldDef;
  label: ReactNode;
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = def.options ?? [];
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        id={`product-${def.key}-toggle`}
        className={`${selectClasses} flex items-center justify-between gap-2 text-left ${error ? "border-brand-orange ring-4 ring-brand-orange/25" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{values.length > 0 ? `${values.length} selected` : def.placeholder ?? "Select…"}</span>
        <ChevronDown className={`h-4 w-4 flex-none transition-transform duration-100 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 shadow-brand-soft" aria-label={def.label}>
          {options.map((option) => {
            const checked = values.includes(option);
            return (
              <label className="flex cursor-pointer items-center gap-2 rounded-wobbly-sm px-2 py-1.5 font-semibold text-brand-black hover:bg-brand-mint/50" key={option}>
                <input type="checkbox" className="h-4 w-4 accent-brand-leaf" checked={checked} onChange={() => onChange(toggleListItem(values, option))} />
                {option}
              </label>
            );
          })}
        </div>
      ) : null}
      {error ? <p className="text-xs font-bold text-brand-orange" role="alert">{error}</p> : null}
    </div>
  );
}

function ConfigField({ def, value, onChange, error }: {
  def: ProductFieldDef;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const label = <>{def.label}{def.required ? <span className="text-brand-orange"> *</span> : null}</>;
  const fieldErrorClasses = error ? "border-brand-orange ring-4 ring-brand-orange/25" : "";
  const errorText = error ? <p className="text-xs font-bold text-brand-orange" role="alert">{error}</p> : null;
  if (def.type === "textarea") {
    return (
      <Field label={label} htmlFor={`product-${def.key}`} hint={def.hint}>
        <TextArea id={`product-${def.key}`} rows={3} value={value} aria-invalid={error ? true : undefined} className={fieldErrorClasses} onChange={(event) => onChange(event.target.value)} />
        {errorText}
      </Field>
    );
  }
  if (def.type === "number") {
    return (
      <Field label={label} htmlFor={`product-${def.key}`} hint={def.hint}>
        <TextInput id={`product-${def.key}`} type="number" inputMode="decimal" min="0" value={value} aria-invalid={error ? true : undefined} className={fieldErrorClasses} onChange={(event) => onChange(event.target.value)} />
        {errorText}
      </Field>
    );
  }
  if (def.type === "select") {
    const options = def.options ?? [];
    return (
      <Field label={label} htmlFor={`product-${def.key}`} hint={def.hint}>
        <select id={`product-${def.key}`} className={`${selectClasses} ${fieldErrorClasses}`} value={value} aria-invalid={error ? true : undefined} onChange={(event) => onChange(event.target.value)}>
          <option value="">{def.placeholder ?? "Select…"}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
          {value !== "" && !options.includes(value) ? <option value={value}>{value}</option> : null}
        </select>
        {errorText}
      </Field>
    );
  }
  const values = splitList(value);
  if (def.type === "chips") {
    return (
      <Field label={label} hint={def.hint}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={def.label}>
          {(def.options ?? []).map((option) => {
            const active = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                className={`${chipClasses} ${active ? chipActive : chipInactive}`}
                onClick={() => onChange(listJoin(toggleListItem(values, option)))}
              >
                {option}
              </button>
            );
          })}
        </div>
        {errorText}
      </Field>
    );
  }
  if (def.type === "multiselect") {
    return <MultiSelectField def={def} label={label} values={values} error={error} onChange={(next) => onChange(listJoin(next))} />;
  }
  return (
    <Field label={label} htmlFor={`product-${def.key}`} hint={def.hint}>
      <TextInput id={`product-${def.key}`} value={value} aria-invalid={error ? true : undefined} className={fieldErrorClasses} onChange={(event) => onChange(event.target.value)} />
      {errorText}
    </Field>
  );
}

function FieldGrid({ fields, getValue, onValue, getError }: {
  fields: ProductFieldDef[];
  getValue: (def: ProductFieldDef) => string;
  onValue: (def: ProductFieldDef, next: string) => void;
  getError?: (def: ProductFieldDef) => string | undefined;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((def) => (
        <div className={def.fullWidth ? "sm:col-span-2" : ""} key={def.key}>
          <ConfigField def={def} value={getValue(def)} error={getError?.(def)} onChange={(next) => onValue(def, next)} />
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({ title, hint, defaultOpen = true, children }: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"
      open={defaultOpen}
      aria-label={title}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="grid gap-1">
          <span className="font-primary text-lg font-bold text-brand-green-ink">{title}</span>
          {hint ? <span className="text-sm text-brand-black/64">{hint}</span> : null}
        </span>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-full border-2 border-brand-forest bg-brand-warm-white" aria-hidden="true">
          <ChevronDown className="h-4 w-4 text-brand-green-ink transition-transform duration-150 group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-4">{children}</div>
    </details>
  );
}

export function ProductForm({
  initial,
  initialIngredients = [],
  inventoryItems = [],
  onSave,
  onCancel,
  ingredientsAvailable = false,
}: {
  initial: ProductRow;
  initialIngredients?: ProductIngredientInput[];
  inventoryItems?: InventoryItemRow[];
  onSave: (row: ProductRow, ingredients: ProductIngredientInput[]) => Promise<void> | void;
  onCancel: () => void;
  ingredientsAvailable?: boolean;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() =>
    initialIngredients.map((ingredient) => ({
      item_id: ingredient.item_id,
      quantity: ingredient.quantity == null ? "" : String(ingredient.quantity),
    })),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [ingredientRowErrors, setIngredientRowErrors] = useState<Record<string, IngredientRowError>>({});
  const [ingredientsSectionError, setIngredientsSectionError] = useState<string | null>(null);

  const categoryConfig = categoryFieldConfig(draft.category);
  const commonFields = commonProductFieldDefs.map((def) => {
    const override = categoryConfig?.commonOverrides?.[def.key];
    return override ? { ...def, ...override } : def;
  });
  const categoryFields = categoryConfig?.fields ?? [];
  const showIngredients = categoryConfig?.showIngredients === true;
  const showTrustStandards = categoryConfig?.showTrustStandards === true;
  const tagsFieldBoundByCategory = categoryFields.some((field) => field.column === "tags");
  const basicFields = commonFields.filter((def) => def.section !== "pricing" && def.section !== "availability");
  const pricingFields = commonFields.filter((def) => def.section === "pricing");
  const availabilityFields = commonFields.filter((def) => def.section === "availability");

  const inventoryById = useMemo(() => new Map(inventoryItems.map((item) => [item.id, item])), [inventoryItems]);
  const includedIds = new Set(ingredients.map((ingredient) => ingredient.item_id));

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setDetail(key: string, value: string) {
    setDraft((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  }

  function setField(def: ProductFieldDef, next: string) {
    if (def.column) {
      set(def.column as keyof ProductDraft, next as never);
    } else {
      setDetail(def.detailKey ?? def.key, next);
    }
    setFieldErrors((current) => {
      if (!(def.key in current)) return current;
      const nextErrors = { ...current };
      delete nextErrors[def.key];
      return nextErrors;
    });
  }

  function handleCategoryChange(value: string) {
    set("category", value);
    setFieldErrors({});
  }

  function addIngredientsFromPicker(selected: InventoryItemRow[]) {
    if (selected.length === 0) return;
    setIngredients((current) => {
      const existingIds = new Set(current.map((ingredient) => ingredient.item_id));
      const fresh = selected
        .filter((item) => !existingIds.has(item.id))
        .map((item) => ({ item_id: item.id, quantity: "1" }));
      return [...current, ...fresh];
    });
    setIngredientsSectionError(null);
  }

  function clearIngredientRowError(itemId: string) {
    setIngredientRowErrors((current) => {
      if (!(itemId in current)) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  function removeIngredient(itemId: string) {
    setIngredients((current) => current.filter((ingredient) => ingredient.item_id !== itemId));
    clearIngredientRowError(itemId);
  }

  function updateIngredient(itemId: string, patch: Partial<IngredientDraft>) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.item_id === itemId ? { ...ingredient, ...patch } : ingredient,
      ),
    );
    clearIngredientRowError(itemId);
  }

  function ingredientInputs(): ProductIngredientInput[] {
    return ingredients.map((ingredient) => {
      const parsedQuantity = Number(ingredient.quantity.trim());
      return {
        item_id: ingredient.item_id,
        quantity: ingredient.quantity.trim() === "" || Number.isNaN(parsedQuantity) ? 0 : parsedQuantity,
      };
    });
  }

  function validate(): { fields: FieldErrorMap; rows: Record<string, IngredientRowError>; ingredientsSection: string | null } {
    const fields: FieldErrorMap = {};
    const rows: Record<string, IngredientRowError> = {};
    let ingredientsSection: string | null = null;

    if (!draft.name.trim()) fields.name = "Product name is required.";
    if (!draft.category.trim()) fields.category = "Category is required.";

    for (const def of categoryConfig?.fields ?? []) {
      if (def.required && !fieldValue(draft, def).trim()) {
        fields[def.key] = `${def.label} is required.`;
      }
    }

    const priceText = draft.price_amount.trim();
    if (priceText !== "") {
      const parsedPrice = Number(priceText);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        fields.price = "Price must be a number of 0 or more.";
      }
    }

    if (showIngredients) {
      if (ingredients.length === 0) {
        ingredientsSection = `At least one inventory item must be linked to this ${draft.category.toLowerCase()}.`;
      } else {
        const seen = new Set<string>();
        for (const ingredient of ingredients) {
          if (seen.has(ingredient.item_id)) {
            ingredientsSection = "The same inventory item cannot be added twice.";
          }
          seen.add(ingredient.item_id);
          const rowError: IngredientRowError = {};
          const quantityText = ingredient.quantity.trim();
          const parsedQuantity = Number(quantityText);
          if (quantityText === "" || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            rowError.quantity = "Quantity must be greater than zero.";
          }
          if (rowError.quantity) rows[ingredient.item_id] = rowError;
        }
      }
    }

    return { fields, rows, ingredientsSection };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validate();
    setFieldErrors(result.fields);
    setIngredientRowErrors(result.rows);
    setIngredientsSectionError(result.ingredientsSection);
    setError(null);
    const hasRowErrors = Object.values(result.rows).some(
      (row) => row.quantity !== undefined,
    );
    if (Object.keys(result.fields).length > 0 || hasRowErrors || result.ingredientsSection !== null) {
      return;
    }
    setBusy(true);
    try {
      await onSave(fromDraft(draft), ingredientInputs());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the product.");
      setBusy(false);
    }
  }

  return (
    <>
      <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Product form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.name ? `Edit ${initial.name}` : "New product"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="product-category" hint="This controls which fields are shown below and is saved with the product. You can change it anytime.">
          <select id="product-category" className={`min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 ${fieldErrors.category ? "border-brand-orange ring-4 ring-brand-orange/25" : "border-brand-forest"} bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20`} value={draft.category} aria-invalid={fieldErrors.category ? true : undefined} onChange={(e) => handleCategoryChange(e.target.value)}>
            {productCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            {!categories.includes(draft.category) ? <option value={draft.category}>{draft.category}</option> : null}
          </select>
          {fieldErrors.category ? <p className="text-xs font-bold text-brand-orange" role="alert">{fieldErrors.category}</p> : null}
        </Field>
      </div>

      <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Basic information">
        <div className="grid gap-1">
          <h3 className="font-primary text-lg font-bold text-brand-green-ink">Basic information</h3>
          <p className="text-sm text-brand-black/64">The essentials customers see first.</p>
        </div>
        <FieldGrid fields={basicFields} getValue={(def) => fieldValue(draft, def)} onValue={(def, next) => setField(def, next)} getError={(def) => fieldErrors[def.key]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImagePicker label="Image" image={draft.image} onChange={(url) => set("image", url)} folder="products" id={draft.id} />
          <Field label="Image alt text" htmlFor="product-alt" hint="Describe the image for accessibility, e.g. Vegetable box with carrots and leafy greens."><TextInput id="product-alt" value={draft.alt} onChange={(e) => set("alt", e.target.value)} /></Field>
        </div>
      </section>

      {categoryFields.length > 0 ? (
        <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Category details">
          <div className="grid gap-1">
            <h3 className="font-primary text-lg font-bold text-brand-green-ink">{categoryConfig?.label ?? "Category details"}</h3>
            <p className="text-sm text-brand-black/64">Details specific to the selected category.</p>
          </div>
          <FieldGrid fields={categoryFields} getValue={(def) => fieldValue(draft, def)} onValue={(def, next) => setField(def, next)} getError={(def) => fieldErrors[def.key]} />
        </section>
      ) : null}

      {showIngredients ? (
        ingredientsAvailable ? (
          <CollapsibleSection title="Items included" hint={`Link inventory items to this ${draft.category.toLowerCase()}. Quantities here define how much is deducted from tracked stock per unit sold.`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span className="rounded-full border-2 border-brand-forest bg-brand-mint px-3 py-1 text-xs font-bold text-brand-green-ink" aria-live="polite">
                {ingredients.length} item{ingredients.length === 1 ? "" : "s"} linked
              </span>
            </div>
            {ingredientsSectionError ? (
              <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{ingredientsSectionError}</p>
            ) : null}

            {inventoryItems.length === 0 ? (
              <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 px-3 py-2 text-sm font-semibold text-brand-black/64">No inventory items yet. Add items in the Inventory tab first, then link them here.</p>
            ) : (
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button className={btnOutlineSm} type="button" onClick={() => setPickerOpen(true)}>+ Add Item</button>
                  <p className="text-xs font-semibold text-brand-black/56">Search inventory items to link one or more ingredients.</p>
                </div>

                {ingredients.length === 0 ? (
                  <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 px-3 py-2 text-sm font-semibold text-brand-black/64">
                    Nothing linked yet. Pick inventory items above to define the contents of this {draft.category.toLowerCase()}.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {ingredients.map((ingredient) => {
                      const item = inventoryById.get(ingredient.item_id);
                      const rowError = ingredientRowErrors[ingredient.item_id];
                      const quantityError = rowError?.quantity ? "border-brand-orange ring-4 ring-brand-orange/25" : "";
                      return (
                        <li className="grid gap-2 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-warm-white px-3 py-2 sm:grid-cols-[1fr_repeat(1,minmax(0,11rem))_auto] sm:items-center" key={ingredient.item_id}>
                          <div className="min-w-0 grid gap-0.5">
                            <span className="truncate font-bold text-brand-black">{item?.name ?? ingredient.item_id}</span>
                            <span className="truncate text-xs text-brand-black/52">{item?.category ?? "Inventory item no longer tracked"}{item?.unit ? ` · ${item.unit}` : ""}</span>
                          </div>
                          <Field label="Quantity" htmlFor={`ingredient-${ingredient.item_id}-quantity`}>
                            <TextInput id={`ingredient-${ingredient.item_id}-quantity`} type="number" inputMode="decimal" min="0" step="0.1" value={ingredient.quantity} aria-invalid={rowError?.quantity ? true : undefined} className={quantityError} onChange={(e) => updateIngredient(ingredient.item_id, { quantity: e.target.value })} />
                            {rowError?.quantity ? <p className="text-xs font-bold text-brand-orange" role="alert">{rowError.quantity}</p> : null}
                          </Field>
                          <button className={btnOutlineSm} type="button" onClick={() => removeIngredient(ingredient.item_id)}>Remove</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </CollapsibleSection>
        ) : (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black">
            Items included are not available yet. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/inventory-schema.sql</code> to create the inventory and product_ingredients tables.
          </p>
        )
      ) : null}

      {showTrustStandards ? (
        <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Trust standards">
          <div className="grid gap-1">
            <h3 className="font-primary text-lg font-bold text-brand-green-ink">Trust standards</h3>
            <p className="text-sm text-brand-black/64">Shown on the Trust standards page for this meal kit. The image, alt text, and Storage from the fields above are reused.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Health benefits" htmlFor="product-benefits" hint="Comma-separated list, e.g. High-quality protein, Rich in fibre.">
              <TextInput id="product-benefits" value={toStringList(draft.health_benefits)} onChange={(e) => set("health_benefits", fromStringList(e.target.value))} placeholder="Benefit 1, Benefit 2, ..." />
            </Field>
            <Field label="Allergens" htmlFor="product-trust-allergens" hint="Comma-separated list for the trust card, e.g. Eggs, Soy. Keep the short Allergen notice above too if useful.">
              <TextInput id="product-trust-allergens" value={toStringList(draft.trust_allergens)} onChange={(e) => set("trust_allergens", fromStringList(e.target.value))} placeholder="Allergen 1, Allergen 2, ..." />
            </Field>
          </div>
          <Field label="Sourcing" htmlFor="product-sourcing" hint="Where the ingredients come from, shown on the Trust standards page.">
            <TextArea id="product-sourcing" rows={3} value={draft.sourcing} onChange={(e) => set("sourcing", e.target.value)} />
          </Field>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Pricing">
        <h3 className="font-primary text-lg font-bold text-brand-green-ink">Pricing</h3>
        <FieldGrid fields={pricingFields} getValue={(def) => fieldValue(draft, def)} onValue={(def, next) => setField(def, next)} getError={(def) => fieldErrors[def.key]} />
      </section>

      <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-label="Availability">
        <h3 className="font-primary text-lg font-bold text-brand-green-ink">Availability</h3>
        <FieldGrid fields={availabilityFields} getValue={(def) => fieldValue(draft, def)} onValue={(def, next) => setField(def, next)} getError={(def) => fieldErrors[def.key]} />
      </section>

      <CollapsibleSection title="Publishing & search" hint="Visibility, ordering, and search keywords." defaultOpen={false}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!tagsFieldBoundByCategory ? (
            <Field label="Tags (comma-separated)" htmlFor="product-tags" hint="Keywords for search and filters, e.g. vegan, gluten free."><TextInput id="product-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
          ) : null}
          <Field label="Collections (comma-separated)" htmlFor="product-collections" hint="top-pick, new, frequent, time-saver, veggie, bundle">
            <TextInput id="product-collections" value={draft.collections} onChange={(e) => set("collections", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order" htmlFor="product-sort" hint="Lower numbers appear first.">
            <TextInput id="product-sort" type="number" value={String(draft.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value))} />
          </Field>
          <div className="grid content-start justify-start gap-2 pt-1.5">
            <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Active (shown on the site). Inactive products display as out of stock." />
          </div>
        </div>
      </CollapsibleSection>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save product"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
      </form>

      <InventoryItemPickerDialog
        open={pickerOpen}
        items={inventoryItems}
        alreadyIncludedIds={includedIds}
        onAdd={addIngredientsFromPicker}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
