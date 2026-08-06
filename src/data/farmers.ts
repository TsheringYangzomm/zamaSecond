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
  partnerSince: number;
  image?: string;
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
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
    partnerSince: 2025,
  },
] as const satisfies readonly Farmer[];
