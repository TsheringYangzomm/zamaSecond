export type DieticianMealKitNote = {
  productId: string;
  consultantNote: string;
  dieticianNote: string;
};

export type Dietician = {
  id: string;
  name: string;
  title: string;
  image?: string;
  bio: string;
  qualifications: string[];
  /**
   * Notes this dietician wrote for specific meal kits.
   * Each entry selects a meal kit and holds its consultant
   * and dietician notes.
   */
  mealKitNotes: DieticianMealKitNote[];
  /** Numeric sort key; lower appears first. */
  sortOrder: number;
  /** When true the profile is visible on the site. */
  published: boolean;
};

export const defaultDieticians: readonly Dietician[] = [
  {
    id: "dietician-tashi",
    name: "Tashi Dorji",
    title: "Registered Dietician",
    image: "",
    bio: "Tashi supports Zama's meal-kit planning, reviewing portion sizes and energy guidance so every kit balances taste with everyday nutrition.",
    qualifications: [
      "MSc Nutrition & Dietetics",
      "Registered with the Bhutan Nutrition Council",
      "8 years in public-health nutrition",
    ],
    mealKitNotes: [
      {
        productId: "breakfast-kit",
        consultantNote: "Balanced macronutrient profile with complex carbohydrates, healthy fats, and lean protein. Suitable for most adults seeking a consistent, nutritious start to the day.",
        dieticianNote: "Portions designed to deliver approximately 450-550 kcal per serving. Fibre content supports sustained energy through the morning. Adjustable portions for higher-calorie or lighter needs.",
      },
    ],
    sortOrder: 0,
    published: true,
  },
];
