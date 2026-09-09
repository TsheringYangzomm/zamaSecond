export type IndividualItem = {
  id: string;
  name: string;
  unit: string;
  description: string;
};

export const individualItemsByCategory: Record<string, readonly IndividualItem[]> = {
  Vegetables: [
    { id: "potato", name: "Potato", unit: "kg", description: "Fresh Bhutanese potatoes, perfect for curries, stews, and everyday cooking." },
    { id: "carrot", name: "Carrot", unit: "kg", description: "Sweet, crunchy carrots ideal for salads, soups, and snacking." },
    { id: "tomato", name: "Tomato", unit: "kg", description: "Vine-ripened tomatoes for sauces, salads, and fresh eating." },
    { id: "broccoli", name: "Broccoli", unit: "kg", description: "Fresh broccoli florets, great for steaming, stir-fries, and roasting." },
    { id: "chilli", name: "Chilli", unit: "kg", description: "Bhutanese chillies for authentic heat and flavour." },
    { id: "herbs", name: "Fresh Herbs", unit: "bunch", description: "A mix of fresh coriander, spring onion, and seasonal herbs." },
    { id: "cabbage", name: "Cabbage", unit: "piece", description: "Fresh cabbage for stir-fries, salads, and soups." },
    { id: "radish", name: "Radish", unit: "kg", description: "Crisp radishes for salads and pickles." },
  ],
  Fruits: [
    { id: "apple", name: "Apple", unit: "kg", description: "Crisp, locally grown apples perfect for snacking and baking." },
    { id: "mango", name: "Mango", unit: "piece", description: "Sweet, juicy mangoes at peak ripeness." },
    { id: "banana", name: "Banana", unit: "bunch", description: "Ripe bananas for smoothies, baking, and quick snacks." },
    { id: "orange", name: "Orange", unit: "piece", description: "Juicy oranges, great for fresh juice and snacking." },
    { id: "pineapple", name: "Pineapple", unit: "piece", description: "Sweet tropical pineapple, ready to slice and serve." },
    { id: "papaya", name: "Papaya", unit: "piece", description: "Ripe papaya, excellent for breakfast and fruit salads." },
    { id: "lime", name: "Lime", unit: "piece", description: "Fresh limes for cooking, drinks, and dressings." },
  ],
  Groceries: [
    { id: "cooking-oil", name: "Cooking Oil", unit: "bottle", description: "Versatile cooking oil for everyday kitchen use." },
    { id: "milk-powder", name: "Milk Powder", unit: "pack", description: "Full cream milk powder for tea, coffee, and cooking." },
    { id: "eggs", name: "Eggs", unit: "tray", description: "Fresh farm eggs, perfect for breakfast and baking." },
    { id: "oats", name: "Oats", unit: "pack", description: "Rolled oats for porridge, overnight oats, and baking." },
    { id: "brown-rice", name: "Brown Rice", unit: "kg", description: "Whole grain brown rice for healthy, hearty meals." },
    { id: "lentils", name: "Lentils", unit: "kg", description: "Protein-rich lentils for soups, dals, and stews." },
    { id: "spices", name: "Spices", unit: "pack", description: "A curated mix of essential Bhutanese spices." },
    { id: "quinoa", name: "Quinoa", unit: "kg", description: "Protein-rich quinoa for salads, bowls, and sides." },
  ],
  "Meal kits": [],
  "Custom boxes": [],
};
