import {
  faqItems,
  featureItems,
  mealKits,
  navItems,
  policyItems,
  pricingPlans,
  processSteps,
  products,
  topPicks,
  trustItems,
  valueItems,
} from "./landing";

export type NavItem = { label: string; href: string };
export type FeatureItem = (typeof featureItems)[number];
export type ValueItem = (typeof valueItems)[number];
export type ProductShowcase = (typeof products)[number];
export type MealKit = (typeof mealKits)[number];
export type ProcessStep = (typeof processSteps)[number];
export type TopPick = (typeof topPicks)[number];
export type PricingPlan = (typeof pricingPlans)[number];
export type TrustItem = (typeof trustItems)[number];
export type FaqItem = (typeof faqItems)[number];
export type PolicyItem = (typeof policyItems)[number];

export type FooterLink = { label: string; href: string };

export type ContentBlocks = {
  nav: {
    items: readonly NavItem[];
    partnerLabel: string;
    joinLabel: string;
    joinShortLabel: string;
  };
  hero: {
    titleA: string;
    titleHighlight: string;
    titleB: string;
    exclaim: string;
    copy: string;
    waitlistEyebrow: string;
    emailPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    mediaAlt: string;
    readyBadge: string;
    harvestTitle: string;
    harvestCopy: string;
    heroImage: string;
    heroImageAlt: string;
  };
  footer: {
    tagline: string;
    location: string;
    joinLabel: string;
    companyTitle: string;
    companyLinks: FooterLink[];
    supportTitle: string;
    supportLinks: FooterLink[];
    copyright: string;
    poweredBy: string;
  };
  features: {
    items: readonly FeatureItem[];
  };
  values: {
    heading: string;
    items: readonly ValueItem[];
  };
  subscriptions: {
    tag: string;
    heading: string;
    primaryLabel: string;
    items: readonly ProductShowcase[];
  };
  mealKits: {
    tag: string;
    heading: string;
    copy: string;
    browseLabel: string;
    featuredLabel: string;
    beforeOrderLabel: string;
    oneBoxLabel: string;
    ingredientsLabel: string;
    nutritionTitle: string;
    nutritionCopy: string;
    nutritionLinkLabel: string;
    items: readonly MealKit[];
  };
  process: {
    tag: string;
    heading: string;
    copy: string;
    fieldNoteLabel: string;
    steps: readonly ProcessStep[];
    notes: readonly string[];
  };
  topPicks: {
    tag: string;
    heading: string;
    items: readonly TopPick[];
  };
  pricing: {
    tag: string;
    heading: string;
    copy: string;
    plans: readonly PricingPlan[];
  };
  launch: {
    deliveryTag: string;
    deliveryHeading: string;
    deliveryCopy: string;
    needHumanLabel: string;
    contactEmail: string;
    contactCopy: string;
    trustTag: string;
    trustHeading: string;
    trustCopy: string;
    trustMarkLabel: string;
    trustItems: readonly TrustItem[];
    policiesTag: string;
    policiesHeading: string;
    policiesCopy: string;
    practicalLabel: string;
    practicalTitle: string;
    practicalCopy: string;
    askCtaLabel: string;
    policyItems: readonly PolicyItem[];
    faqsLabel: string;
    faqsHeading: string;
    faqsBadge: string;
    faqItems: readonly FaqItem[];
    faqsCtaTitle: string;
    faqsCtaCopy: string;
    faqsCtaLabel: string;
    b2bTag: string;
    b2bHeading: string;
    b2bCopy: string;
    b2bCtaLabel: string;
    b2bStampCopy: string;
    b2bJoinLabel: string;
  };
  shopSection: {
    tag: string;
    heading: string;
    copy: string;
    ctaLabel: string;
    footerPrefix: string;
    footerBrowseLabel: string;
    footerDeliveryLabel: string;
  };
  shopPage: {
    tag: string;
    heading: string;
    copy: string;
    emptyTitle: string;
    emptyCopy: string;
    emptyCtaLabel: string;
    deliveryTitle: string;
    deliveryCopy: string;
    deliveryCtaLabel: string;
  };
  farmersSection: {
    tag: string;
    heading: string;
    copy: string;
    carouselLabel: string;
    ctaLabel: string;
  };
  farmersPage: {
    tag: string;
    heading: string;
    copy: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyCopy: string;
    emptyCtaLabel: string;
  };
  planBuilder: {
    tag: string;
    heading: string;
    copy: string;
    ctaLabel: string;
    previewLabel: string;
    previewPrice: string;
    nextDeliveryLabel: string;
    deliveryTitle: string;
    deliveryEstimate: string;
    farmLabel: string;
    kitchenLabel: string;
    listItems: readonly string[];
  };
  productPage: {
    backLabel: string;
    contentsShownLabel: string;
    priceLabel: string;
    notFoundTag: string;
    notFoundTitle: string;
    notFoundCopy: string;
    notFoundCtaLabel: string;
    relatedHeading: string;
    suggestionsHeading: string;
  };
};

export const defaultBlocks: ContentBlocks = {
  nav: {
    items: navItems,
    partnerLabel: "Partner with us",
    joinLabel: "Join launch updates",
    joinShortLabel: "Join",
  },
  hero: {
    titleA: "Meal kits &",
    titleHighlight: "fresh groceries",
    titleB: "for Bhutan",
    exclaim: "!",
    copy: "Plan dinner, top up the kitchen, and see what is in your basket before you order. Local produce comes first when it is in season.",
    waitlistEyebrow: "Get first access · no payment today",
    emailPlaceholder: "you@example.com…",
    submitLabel: "Join Launch Updates",
    submittingLabel: "Joining…",
    mediaAlt: "Fresh groceries and local produce",
    readyBadge: "Ready to cook",
    harvestTitle: "Local-first",
    harvestCopy: "Seasonal sourcing, shown clearly.",
    heroImage: "assets/hero.webp",
    heroImageAlt: "Fresh produce, grocery bags, and delivery boxes",
  },
  footer: {
    tagline: "Meal kits and groceries for Thimphu, with sourcing shown clearly.",
    location: "Thimphu, Bhutan",
    joinLabel: "Join launch updates",
    companyTitle: "Company",
    companyLinks: [
      { label: "About Zama", href: "#about" },
      { label: "Our Farms", href: "#farmers" },
      { label: "Sourcing and trust", href: "#trust" },
      { label: "Careers", href: "mailto:hello@zama.bt?subject=Career%20enquiry" },
      { label: "Press", href: "mailto:hello@zama.bt?subject=Press%20enquiry" },
    ],
    supportTitle: "Support",
    supportLinks: [
      { label: "How it Works", href: "#how-it-works" },
      { label: "Farm Partnership", href: "#b2b" },
      { label: "Delivery Areas", href: "#delivery" },
      { label: "Contact Us", href: "#/contact" },
      { label: "Privacy Policy", href: "#privacy-policy" },
    ],
    copyright: "© 2026 Zama Technologies, Thimphu, Bhutan. All Rights Reserved.",
    poweredBy: "Powered by Jaggle AI",
  },
  features: {
    items: featureItems,
  },
  values: {
    heading: "Why Zama works",
    items: valueItems,
  },
  subscriptions: {
    tag: "Shop categories",
    heading: "Explore the range",
    primaryLabel: "Get this box",
    items: products,
  },
  mealKits: {
    tag: "Meal kits",
    heading: "Meal decisions, already sketched out.",
    copy: "Choose a useful starting point, then see the final recipe, portions, price, nutrition, and allergens together before ordering.",
    browseLabel: "Browse meal kits",
    featuredLabel: "Featured menu concept",
    beforeOrderLabel: "Before you order",
    oneBoxLabel: "One simple box",
    ingredientsLabel: "Ingredients shown clearly",
    nutritionTitle: "Nutrition information belongs beside the recipe.",
    nutritionCopy: "Macros, allergens, portions, and dietary guidance will be published after each final recipe is professionally reviewed.",
    nutritionLinkLabel: "View trust standards",
    items: mealKits,
  },
  process: {
    tag: "How it works",
    heading: "Follow the box from field to fork.",
    copy: "A simple route, with clear checkpoints instead of hidden steps.",
    fieldNoteLabel: "Field note",
    steps: processSteps,
    notes: [
      "Pick the box that fits your week.",
      "Portions and sources are checked.",
      "Your delivery window is confirmed.",
      "Follow the simple recipe note.",
      "Save a favourite for next time.",
    ],
  },
  topPicks: {
    tag: "This week's top picks",
    heading: "Made with what's fresh now.",
    items: topPicks,
  },
  pricing: {
    tag: "Launch access and future membership",
    heading: "Start with the preview. Decide on membership later.",
    copy: "There is no billing today. Zama will publish final benefits, price, renewal, pause, and cancellation terms before membership enrollment opens.",
    plans: pricingPlans,
  },
  launch: {
    deliveryTag: "Delivery and support",
    deliveryHeading: "The practical details, written like a receipt.",
    deliveryCopy: "Zama is starting in Thimphu. Exact coverage, hours, fees, and delivery windows will be visible before paid orders open.",
    needHumanLabel: "Need a human?",
    contactEmail: "hello@zama.bt",
    contactCopy: "Launch questions, feedback, and partnerships.",
    trustTag: "Trust, made visible",
    trustHeading: "Proof belongs beside the promise.",
    trustCopy: "These become verified records—not decorative claims—before checkout goes live.",
    trustMarkLabel: "Trust mark",
    trustItems,
    policiesTag: "Help, policies and Zama",
    policiesHeading: "The notes behind every box.",
    policiesCopy: "Plain-language policies, quick answers, and the reason Zama is being built—kept together like an open field notebook.",
    practicalLabel: "01 · Practical promises",
    practicalTitle: "Fine print, in plain language.",
    practicalCopy: "Final legal wording, licenses, and effective dates will be reviewed before checkout goes live.",
    askCtaLabel: "Ask Zama anything",
    policyItems,
    faqsLabel: "03 · Quick answers",
    faqsHeading: "Questions people ask before the first box.",
    faqsBadge: "Launch information",
    faqItems,
    faqsCtaTitle: "Still haven't found what you're looking for?",
    faqsCtaCopy: "A real human reads every message Zama receives.",
    faqsCtaLabel: "Message Zama",
    b2bTag: "A note for partners",
    b2bHeading: "Bring better food closer to your people.",
    b2bCopy: "Gyms, offices, hotels, universities, and farms can join the early partnership list while the Thimphu operating model is finalized.",
    b2bCtaLabel: "Start a partnership conversation",
    b2bStampCopy: "Ready to cook, built for Thimphu.",
    b2bJoinLabel: "Join customer launch updates",
  },
  shopSection: {
    tag: "Launch shop",
    heading: "Shop the launch range.",
    copy: "A first look at every fresh box, meal kit, and grocery top-up. Open the full shop for portions, ingredients, and reviews.",
    ctaLabel: "View full shop",
    footerPrefix: "Want the full range, portions, and buyer reviews?",
    footerBrowseLabel: "Browse the full shop →",
    footerDeliveryLabel: "delivery details.",
  },
  shopPage: {
    tag: "Zama Shop",
    heading: "All products, one basket.",
    copy: "Every fresh box, meal kit, and grocery top-up in the launch range — with price, portions, and contents shown before you add them to one shared basket.",
    emptyTitle: "Nothing on the shelf for that combination.",
    emptyCopy: "Try a different filter, or clear everything and browse the whole range.",
    emptyCtaLabel: "Clear filters",
    deliveryTitle: "Preparing for Thimphu deliveries.",
    deliveryCopy: "Coverage, hours, and delivery fees will be published before orders open. No payment or order is created at launch.",
    deliveryCtaLabel: "Review delivery details",
  },
  farmersSection: {
    tag: "Our farmers",
    heading: "Real people behind every ingredient.",
    copy: "Every partner is verified. Every product is traceable. Meet the farmers growing your food in Bhutan.",
    carouselLabel: "Farmer profiles",
    ctaLabel: "View all farmers",
  },
  farmersPage: {
    tag: "Our farmers",
    heading: "Meet the people growing your food.",
    copy: "Every partner is verified. Every product is traceable. Browse the farmers supplying fresh, local produce across Bhutan.",
    searchPlaceholder: "Search by name, location, or product...",
    emptyTitle: "No farmers found",
    emptyCopy: "Try changing your filters or search, or clear everything and browse all farmers.",
    emptyCtaLabel: "Clear all filters",
  },
  planBuilder: {
    tag: "Zama app",
    heading: "Build your plan the way you eat.",
    copy: "The future app will help customers pick a box, set delivery days, and see the farmer story behind each ingredient. Join the launch list until the app is live.",
    ctaLabel: "Get app launch updates",
    previewLabel: "Launch preview",
    previewPrice: "Pricing pending",
    nextDeliveryLabel: "Next delivery",
    deliveryTitle: "Vegetable Box + Recipe Kit",
    deliveryEstimate: "Delivery window confirmed before checkout",
    farmLabel: "Farm",
    kitchenLabel: "Kitchen",
    listItems: ["Punakha greens", "Paro potatoes", "Datshi kit"],
  },
  productPage: {
    backLabel: "← Back to shop",
    contentsShownLabel: "Contents shown before ordering",
    priceLabel: "Price",
    notFoundTag: "Product not found",
    notFoundTitle: "That product is not on the shelf.",
    notFoundCopy: "The link may be out of date or the product may have been renamed. Browse the full launch range instead.",
    notFoundCtaLabel: "Browse all products",
    relatedHeading: "More",
    suggestionsHeading: "You may also like",
  },
};
