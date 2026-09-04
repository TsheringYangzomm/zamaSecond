import { useState } from "react";
import {
  Apple,
  Carrot,
  ChefHat,
  Check,
  House,
  Package,
  ShoppingBasket,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";

export type ProductCategoryOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const productCategoryOptions: ProductCategoryOption[] = [
  {
    value: "Vegetables",
    label: "Vegetables",
    description: "Seasonal produce from Bhutanese farms.",
    icon: Carrot,
  },
  {
    value: "Fruits",
    label: "Fruits",
    description: "Peak-ripeness fruit selections.",
    icon: Apple,
  },
  {
    value: "Meal kits",
    label: "Meal Kits",
    description: "Pre-portioned recipes for easy home cooking.",
    icon: ChefHat,
  },
  {
    value: "Custom boxes",
    label: "Boxes",
    description: "Mix produce, meal kits, and pantry into one refill.",
    icon: Package,
  },
  {
    value: "Groceries",
    label: "Groceries",
    description: "Pantry staples and snacks for a weekly top-up.",
    icon: ShoppingBasket,
  },
  {
    value: "Household Essentials",
    label: "Household Essentials",
    description: "Daily essentials for the home.",
    icon: House,
  },
  {
    value: "Other",
    label: "Other",
    description: "Anything that doesn't fit the categories above.",
    icon: MoreHorizontal,
  },
];

const cardBase =
  "group relative flex min-h-40 flex-col items-start gap-3 rounded-wobbly-card border-3 p-5 text-left shadow-brand-soft transition-[background-color,box-shadow,transform] duration-120 ease-in-out hover:shadow-brand hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4";

const cardUnselected = "border-brand-forest bg-brand-white";
const cardSelected =
  "border-brand-forest bg-brand-mint shadow-brand";

const iconShell = "grid h-12 w-12 flex-none place-items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-yellow text-brand-forest shadow-brand-soft transition-transform duration-120 ease-in-out group-hover:-rotate-3 group-hover:scale-105";

const checkBadge =
  "absolute -right-2.5 -top-2.5 grid h-8 w-8 place-items-center rounded-full border-2 border-brand-forest bg-brand-leaf text-brand-white shadow-brand-tight";

export function ProductCategoryPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (value: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = productCategoryOptions.find((option) => option.value === selected);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">
          What type of product are you adding?
        </h2>
        <p className="text-sm text-brand-black/68">
          Choose a category, then continue to the product form. You can change it later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productCategoryOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={`${cardBase} ${isSelected ? cardSelected : cardUnselected}`}
              onClick={() => setSelected(option.value)}
            >
              {isSelected ? (
                <span className={checkBadge} aria-hidden="true">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : null}
              <span className={iconShell}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="grid gap-1">
                <span className="font-primary text-lg font-bold leading-tight text-brand-green-ink">
                  {option.label}
                </span>
                <span className="text-sm text-brand-black/64">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btnPrimarySm}
          type="button"
          disabled={selected === null}
          onClick={() => { if (selected) onSelect(selected); }}
        >
          {chosen ? `Continue with ${chosen.label}` : "Continue"}
        </button>
        <button className={btnOutlineSm} type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}