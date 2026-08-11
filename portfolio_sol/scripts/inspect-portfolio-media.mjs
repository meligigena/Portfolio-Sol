import {
  printInventory,
  scanPortfolioMedia,
} from "./lib/portfolio-media.mjs";

const inventory = await scanPortfolioMedia();

printInventory(inventory, { includeVideos: true });

console.log("\nLargest files:");
[...inventory.files]
  .sort((left, right) => right.bytes - left.bytes)
  .slice(0, 10)
  .forEach((file) => {
    console.log(
      `  - ${file.storagePath}: ${(file.bytes / 1024 ** 2).toFixed(3)} MiB`,
    );
  });

