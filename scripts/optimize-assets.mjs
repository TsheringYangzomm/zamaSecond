import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const assetDirectory = resolve("public/assets");
const conversions = [
  ["hero.png", "hero.webp", 82],
  ["vegetableBox.png", "vegetable-box.webp", 82],
  ["fruit box.png", "fruit-box.webp", 82],
  ["grocery box.png", "grocery-box.webp", 82],
  ["mealkit box.png", "meal-kit-box.webp", 82],
  ["allInOneBox.png", "all-in-one-box.webp", 82],
  ["orderkit.png", "breakfast-kit.webp", 80],
  ["choose (2).png", "choose.webp", 80],
  ["packed.png", "packed.webp", 80],
  ["delivered (2).png", "delivered.webp", 80],
  ["cook (2).png", "cook.webp", 80],
  ["farmer.png", "farmer.webp", 76],
  ["topPick.png", "top-pick.webp", 80],
];

let sourceBytes = 0;
let optimizedBytes = 0;

for (const [sourceName, outputName, quality] of conversions) {
  const sourcePath = resolve(assetDirectory, sourceName);
  const outputPath = resolve(assetDirectory, outputName);
  const sourceInfo = await stat(sourcePath);

  await sharp(sourcePath)
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toFile(outputPath);

  const outputInfo = await stat(outputPath);
  sourceBytes += sourceInfo.size;
  optimizedBytes += outputInfo.size;
  console.log(`${sourceName} -> ${outputName} (${Math.round(outputInfo.size / 1024)} KB)`);
}

const reduction = Math.round((1 - optimizedBytes / sourceBytes) * 100);
console.log(`Optimized ${conversions.length} assets: ${reduction}% smaller.`);
