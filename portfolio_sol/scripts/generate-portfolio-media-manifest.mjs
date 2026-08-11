import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertManifestSafeToWrite,
  BUCKET_NAME,
  scanPortfolioMedia,
} from "./lib/portfolio-media.mjs";

const projectRoot = process.cwd();
const manifestPath = path.join(
  projectRoot,
  "scripts",
  "portfolio-media-manifest.json",
);
const inventory = await scanPortfolioMedia();
let existingCount;

try {
  const existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  existingCount = existingManifest.files?.length;
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

assertManifestSafeToWrite({
  existingCount,
  nextCount: inventory.files.length,
});

const manifest = {
  schemaVersion: 1,
  bucket: BUCKET_NAME,
  files: inventory.files.map(
    ({ bytes, contentType, kind, localPath, storagePath }) => ({
      bytes,
      contentType,
      kind,
      localPath,
      storagePath,
    }),
  ),
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Manifest written: ${manifestPath}`);
console.log(`Files: ${manifest.files.length}`);
