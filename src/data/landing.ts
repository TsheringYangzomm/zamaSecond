export const navItems = [
  { label: "Shop", href: "#shop" },
  { label: "Meal Kits", href: "#meal-kits" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Farmers", href: "#farmers" },
] as const;

export const featureItems = [
  { number: "01", copy: "Local produce when in season", tone: "yellow" },
  { number: "02", copy: "Clear ingredients and portions", tone: "white" },
  { number: "03", copy: "Built for Thimphu first", tone: "yellow" },
  { number: "04", copy: "Support before you order", tone: "white" },
] as const;

export const valueItems = [
  {
    title: "Eat Well",
    body: "Seasonal produce from Bhutanese farms when it is available, with sourcing shown clearly.",
    image: "assets/Frame.png",
    tone: "white",
    rotation: "-rotate-[1.3deg]",
  },
  {
    title: "Less fuss",
    body: "Portioned meal kits and simple grocery boxes help you plan without hiding what is inside.",
    image: "assets/Frame (1).png",
    tone: "yellow",
    rotation: "rotate-[1.1deg]",
  },
  {
    title: "One box",
    body: "Keep fresh boxes, meal kits, and everyday pantry essentials in one clear basket.",
    image: "assets/Frame (2).png",
    tone: "white",
    rotation: "-rotate-[0.5deg]",
  },
] as const;

export const products = [
  {
    name: "Vegetable Box",
    eyebrow: "Weekly fresh box",
    description: "Seasonal vegetables sourced from Bhutanese farms when available, with the current contents shown before ordering.",
    image: "assets/vegetableBox.png",
    alt: "Vegetable box with fresh greens",
    secondaryLabel: "View the shop",
    secondaryHref: "#shop",
    layout: "standard",
    tone: "white",
  },
  {
    name: "Fruit Box",
    eyebrow: "Peak ripeness",
    description: "Seasonal fruit selected for freshness, with availability and substitutions explained up front.",
    image: "assets/fruit box.png",
    alt: "Fruit box with seasonal fruit",
    secondaryLabel: "View the shop",
    secondaryHref: "#shop",
    layout: "reverse",
    tone: "yellow",
  },
  {
    name: "Grocery Box",
    eyebrow: "Everyday staples",
    description: "A practical pantry top-up with staples, snacks, and household essentials listed by item.",
    image: "assets/grocery box.png",
    alt: "Grocery box with pantry essentials",
    secondaryLabel: "View the shop",
    secondaryHref: "#shop",
    layout: "standard",
    tone: "yellow",
  },
  {
    name: "Meal Kit Box",
    eyebrow: "Recipes included",
    description: "Pre-portioned ingredients and a recipe card, with final nutrition and allergen details published after review.",
    image: "assets/mealkit box.png",
    alt: "Meal kit box with pre-portioned ingredients",
    secondaryLabel: "Explore meal kits",
    secondaryHref: "#meal-kits",
    layout: "reverse",
    tone: "white",
  },
  {
    name: "All in One Box",
    eyebrow: "Full kitchen refill",
    description: "A flexible kitchen refill combining fresh produce, meal kits, and everyday pantry essentials.",
    image: "assets/allInOneBox.png",
    alt: "All-in-one box with groceries and produce",
    secondaryLabel: "View the shop",
    secondaryHref: "#shop",
    layout: "standard",
    tone: "yellow",
  },
] as const;

export const mealKits = [
  { title: "Breakfast Kit", eyebrow: "Balanced concept", description: "Eggs, avocado, oats, and greens. Final portions and nutrition are pending review.", price: "Launch pricing pending", alt: "Breakfast meal kit ingredients", variant: "yellow", rotation: "-rotate-[1.2deg]", badge: "" },
  { title: "Muscle Gain Kit", eyebrow: "High-protein concept", description: "Chicken, brown rice, broccoli, carrot, and legumes. Final claims require nutritionist sign-off.", price: "Launch pricing pending", alt: "Muscle gain meal kit ingredients", variant: "green", rotation: "rotate-[1.4deg]", badge: "Planned" },
  { title: "Weight Loss Kit", eyebrow: "Balanced concept", description: "Vegetables, tofu, quinoa, lentils, and herbs. Final nutrition information will be published before launch.", price: "Launch pricing pending", alt: "Balanced meal kit ingredients", variant: "yellow", rotation: "-rotate-[0.7deg]", badge: "" },
] as const;

export const processSteps = [
  { title: "Choose.", number: "1", image: "assets/choose (2).png", alt: "Choosing a produce box", tone: "white", rotation: "-rotate-[1.4deg]" },
  { title: "Packed.", number: "2", image: "assets/packed.png", alt: "Packed grocery box", tone: "yellow", rotation: "rotate-[1.3deg]" },
  { title: "Delivered.", number: "3", image: "assets/delivered (2).png", alt: "Delivery arriving at the door", tone: "white", rotation: "-rotate-[1.4deg]" },
  { title: "Cook.", number: "4", image: "assets/cook (2).png", alt: "Cooking fresh produce", tone: "yellow", rotation: "rotate-[1.3deg]" },
  { title: "Repeat.", number: "5", image: "assets/choose (2).png", alt: "Choosing the next weekly box", tone: "white", rotation: "-rotate-[1.4deg]" },
] as const;

export const topPicks = [
  { name: "Ema Datshi Kit", duration: "~20 mins", tone: "white" },
  { name: "Kewa Datshi Kit", duration: "~35 mins", tone: "yellow" },
  { name: "Cabbage Fry Kit", duration: "~25 mins", tone: "white" },
] as const;

export const farmers = [
  { name: "Tshewang Dorji", place: "Punakha Valley", produce: "Greens and herbs", certification: "Certification to be confirmed", story: "Read his story", rotation: "-rotate-[1.1deg]" },
  { name: "Choki Wangmo", place: "Thimphu Valley", produce: "Seasonal vegetables and fruit", certification: "Certification to be confirmed", story: "Read her story", rotation: "rotate-[1.2deg]" },
  { name: "Sonam Lhamo", place: "Paro Valley", produce: "Root vegetables and dairy", certification: "Certification to be confirmed", story: "Read her story", rotation: "-rotate-[1.1deg]" },
] as const;

export const pricingPlans = [
  {
    name: "Free to browse",
    price: "Nu 0",
    cadence: "",
    eyebrow: "Launch access",
    features: ["Explore the planned range", "Join the Thimphu launch list", "Receive product and service updates", "No payment required"],
    action: "Join the launch list",
    tone: "white",
    rotation: "-rotate-1",
  },
  {
    name: "Zama+ planned",
    price: "Coming soon",
    cadence: "",
    eyebrow: "Planned phase 2",
    features: ["Subscription options after launch data", "Delivery benefits to be confirmed", "Nutrition support subject to qualified review", "Seasonal stock updates", "Pause and skip rules published before billing"],
    action: "Join the launch list",
    tone: "yellow",
    rotation: "rotate-1",
  },
] as const;

export const shopProducts = [
  {
    id: "seasonal-vegetable-box",
    name: "Seasonal Vegetable Box",
    eyebrow: "Fresh box",
    description: "A rotating mix of vegetables selected from the current Thimphu supply plan.",
    image: "assets/vegetableBox.png",
    alt: "Seasonal vegetable box",
    category: "Fresh boxes",
    priceLabel: "Launch pricing pending",
    priceUnit: "per box",
    servings: "Household size varies",
    source: "Bhutanese produce when in season",
    nutrition: "Nutrition varies by weekly contents",
    tags: ["Seasonal", "Local-first"],
  },
  {
    id: "meal-kit-box",
    name: "Recipe Meal Kit",
    eyebrow: "Cook at home",
    description: "Pre-portioned ingredients and a recipe card designed for a simple home-cooked meal.",
    image: "assets/mealkit box.png",
    alt: "Pre-portioned meal kit box",
    category: "Meal kits",
    priceLabel: "Launch pricing pending",
    priceUnit: "per kit",
    servings: "1 or 2 servings",
    source: "Local ingredients where available; imports identified",
    nutrition: "Macros and allergens published after review",
    tags: ["Recipe included", "Portioned"],
  },
  {
    id: "grocery-top-up",
    name: "Grocery Top-Up",
    eyebrow: "Everyday essentials",
    description: "A focused basket of pantry, snack, beverage, and household essentials for a quick refill.",
    image: "assets/grocery box.png",
    alt: "Grocery essentials box",
    category: "Groceries",
    priceLabel: "Prices shown at launch",
    priceUnit: "per item",
    servings: "Varies by item",
    source: "Supplier and country of origin shown per item",
    nutrition: "Product label information shown where applicable",
    tags: ["Pantry", "Top-up"],
  },
  {
    id: "fruit-box",
    name: "Seasonal Fruit Box",
    eyebrow: "Peak ripeness",
    description: "A seasonal fruit selection with contents confirmed before the order is accepted.",
    image: "assets/fruit box.png",
    alt: "Seasonal fruit box",
    category: "Fresh boxes",
    priceLabel: "Launch pricing pending",
    priceUnit: "per box",
    servings: "Household size varies",
    source: "Local and imported fruit clearly identified",
    nutrition: "Nutrition varies by weekly contents",
    tags: ["Seasonal", "Fresh"],
  },
] as const;

export const deliveryDetails = [
  { label: "Launch area", value: "Thimphu first; exact coverage is being finalized" },
  { label: "Service hours", value: "Published before orders open" },
  { label: "Delivery fee", value: "Shown clearly at checkout once configured" },
  { label: "Minimum basket", value: "Confirmed before launch" },
  { label: "Payment", value: "Bhutanese digital payment options and cash-on-delivery subject to activation" },
  { label: "Out-of-stock items", value: "You are contacted before any substitution" },
] as const;

export const trustItems = [
  { title: "Clear product information", body: "Ingredients, portions, allergens, source, storage, and price unit belong on every product record.", tone: "white" },
  { title: "Food safety first", body: "Food-safety licensing, handler training, batch records, and cold-chain procedures are launch requirements.", tone: "yellow" },
  { title: "Local when available", body: "We prioritize Bhutanese produce in season and identify imported ingredients instead of making blanket claims.", tone: "white" },
  { title: "Proof before promises", body: "Licenses, certifications, delivery targets, and nutrition claims are published only after verification.", tone: "yellow" },
] as const;

export const faqItems = [
  { question: "Where will Zama deliver first?", answer: "Zama is preparing a Thimphu-first launch. Enter your neighborhood on the launch form and we will confirm coverage when the service area is finalized." },
  { question: "Are all ingredients locally sourced?", answer: "No. We prioritize local produce when it is in season and clearly identify imported ingredients and their source." },
  { question: "Will meal kits include nutrition and allergen information?", answer: "Yes. Final nutrition and allergen information will be published after each recipe has been reviewed by a qualified professional." },
  { question: "What happens when an item is unavailable?", answer: "We will contact you before substituting a product. You can accept the replacement, remove the item, or follow the published refund process." },
  { question: "How can I contact Zama?", answer: "Email hello@zama.bt for launch questions, product feedback, or support. Phone and WhatsApp details will be added once activated." },
] as const;

export const policyItems = [
  { id: "delivery-policy", title: "Delivery and coverage", body: "Thimphu is the launch geography. Exact neighborhoods, hours, fees, and delivery windows will be displayed before ordering and may vary by availability." },
  { id: "refund-policy", title: "Refunds and cancellations", body: "Perishable-item issues, missing items, damage, and cancellations need a clear written policy before checkout opens. Zama will publish the final process, required evidence, and response times before accepting paid orders." },
  { id: "privacy-policy", title: "Privacy", body: "Waitlist and support details should only be used to operate the service, answer requests, and communicate launch updates. The final privacy notice will identify retention, access, deletion, and contact procedures." },
  { id: "food-safety-policy", title: "Food safety and allergens", body: "Always check the product record and label before consumption. Customers with allergies or medical dietary needs should contact Zama before ordering; Zama does not replace medical advice." },
] as const;
