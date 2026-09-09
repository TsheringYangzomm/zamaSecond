export type FarmTag = "Vegetable" | "Fruit" | "Herbs" | "Organic" | "Seasonal";

export type Farmer = {
  id: string;
  name: string;
  location: string;
  dzongkhag: string;
  products: readonly string[];
  tags: readonly FarmTag[];
  yearsFarming: number;
  bio: string;
  verified: boolean;
  partnerSince: string | null;
  image?: string;
  /** Longer evergreen narrative, shown publicly when the admin publishes it. */
  story?: string;
  /** Latest published seasonal update quote, shown on the landing page. */
  seasonalUpdate?: string;
};

export const farmerDzongkhags = [
  "Bumthang",
  "Chhukha",
  "Haa",
  "Paro",
  "Punakha",
  "Samtse",
  "Thimphu",
  "Trongsa",
  "Wangdue Phodrang",
] as const;

export type Dzongkhag = (typeof farmerDzongkhags)[number];

export const farmerTagFilters: readonly FarmTag[] = ["Vegetable", "Fruit", "Herbs", "Organic", "Seasonal"] as const;

export const farmers = [
  {
    id: "pema-dorji",
    name: "Pema Dorji",
    location: "Paro, Bhutan",
    dzongkhag: "Paro",
    products: ["Cabbage", "Carrots", "Potatoes", "Spinach"],
    tags: ["Vegetable", "Organic"],
    yearsFarming: 18,
    bio: "Third-generation farmer committed to sustainable highland agriculture.",
    verified: true,
    partnerSince: "2025-03-14",
    seasonalUpdate: "This season we're harvesting crisp cabbages and carrots from the terraced fields above Paro.",
    story:
      "Pema Dorji's grandfather first planted these terraced fields more than fifty years ago. Pema took over the farm in his twenties and has spent the years since rebuilding the soil with compost, rotating crops between the seasons, and keeping a small herd for natural manure. Everything he grows is harvested by hand, packed the same morning, and sent down to Paro's market the very same day.",
  },
  {
    id: "yeshey-wangmo",
    name: "Yeshey Wangmo",
    location: "Thimphu, Bhutan",
    dzongkhag: "Thimphu",
    products: ["Tomatoes", "Chillies", "Spring Onions"],
    tags: ["Vegetable", "Seasonal"],
    yearsFarming: 12,
    bio: "Supplies fresh produce to Thimphu markets for over a decade.",
    verified: true,
    partnerSince: "2025-03-14",
    story:
      "Yeshey Wangmo grew up helping her family on their small plot outside Thimphu. Today she runs the farm herself, growing tomatoes, chillies, and spring onions in a simple greenhouse that lets her extend the season well into the cooler months. She has trained alongside agronomists from the agriculture ministry and now mentors young farmers in her neighbourhood.",
  },
  {
    id: "tashi-phuntsho",
    name: "Tashi Phuntsho",
    location: "Bumthang, Bhutan",
    dzongkhag: "Bumthang",
    products: ["Apples", "Pears", "Honey"],
    tags: ["Fruit", "Organic", "Seasonal"],
    yearsFarming: 25,
    bio: "Known for highland orchards and raw honey from Bumthang valleys.",
    verified: true,
    partnerSince: "2025-03-14",
    seasonalUpdate: "The apple trees flowered early this year and the bees are busy across the valley.",
  },
  {
    id: "karma-lhamo",
    name: "Karma Lhamo",
    location: "Punakha, Bhutan",
    dzongkhag: "Punakha",
    products: ["Rice", "Millet", "Buckwheat"],
    tags: ["Vegetable", "Organic"],
    yearsFarming: 20,
    bio: "Cultivates valley-floor grains using traditional flood-irrigation methods.",
    verified: true,
    partnerSince: "2025-03-14",
    seasonalUpdate: "This year my main product is rice, and we are expecting a stronger harvest.",
    story:
      "Karma Lhamo farms the fertile floor of the Punakha valley, where her family has grown rice for generations. She still uses the traditional flood-irrigation channels that carry snowmelt across the terraces, and she rotates millet and buckwheat to keep the soil healthy. Each winter she hosts a small festival where neighbouring families gather to pound the new rice by hand.",
  },
  {
    id: "rigzin-dorji",
    name: "Rigzin Dorji",
    location: "Haa, Bhutan",
    dzongkhag: "Haa",
    products: ["Potatoes", "Turnips", "Radishes"],
    tags: ["Vegetable", "Seasonal"],
    yearsFarming: 15,
    bio: "High-altitude root crop specialist from the Haa valley.",
    verified: true,
    partnerSince: "2025-03-14",
  },
  {
    id: "deki-yangzom",
    name: "Deki Yangzom",
    location: "Chhukha, Bhutan",
    dzongkhag: "Chhukha",
    products: ["Bananas", "Oranges", "Guavas"],
    tags: ["Fruit", "Seasonal"],
    yearsFarming: 10,
    bio: "Runs a family citrus farm in the subtropical belt of Chhukha.",
    verified: true,
    partnerSince: "2025-03-14",
  },
  {
    id: "jigme-tenzin",
    name: "Jigme Tenzin",
    location: "Wangdue Phodrang, Bhutan",
    dzongkhag: "Wangdue Phodrang",
    products: ["Mushrooms", "Coriander", "Mint"],
    tags: ["Herbs", "Organic"],
    yearsFarming: 8,
    bio: "Specialises in forest-edge mushrooms and culinary herbs.",
    verified: true,
    partnerSince: "2025-03-14",
  },
  {
    id: "ngawang-choden",
    name: "Ngawang Choden",
    location: "Trongsa, Bhutan",
    dzongkhag: "Trongsa",
    products: ["Maize", "Soybeans", "Buckwheat"],
    tags: ["Vegetable", "Organic", "Seasonal"],
    yearsFarming: 22,
    bio: "Central-Bhutan grain farmer preserving heirloom crop varieties.",
    verified: true,
    partnerSince: "2025-03-14",
  },
] as const satisfies readonly Farmer[];
