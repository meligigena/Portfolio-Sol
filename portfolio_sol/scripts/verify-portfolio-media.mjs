import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createAdminClient,
  findBucket,
  formatBytes,
  listRemoteObjects,
  loadMigrationEnv,
  migrationDecision,
  migrationConfig,
  printInventory,
  publicObjectUrl,
  remoteObjectSize,
  scanPortfolioMedia,
} from "./lib/portfolio-media.mjs";

loadMigrationEnv();

const inventory = await scanPortfolioMedia();
printInventory(inventory);
const manifest = JSON.parse(
  await readFile(
    path.resolve(process.cwd(), "scripts", "portfolio-media-manifest.json"),
    "utf8",
  ),
);

if (manifest.bucket !== "portfolio-media" || manifest.schemaVersion !== 1) {
  throw new Error("Unsupported portfolio media manifest.");
}

let config;

try {
  config = migrationConfig();
} catch (error) {
  console.error(`\nVerification not started: ${error.message}`);
  process.exit(1);
}

const supabase = createAdminClient(config);
const bucket = await findBucket(supabase, config.bucket);

if (!bucket) {
  console.error(`Bucket ${config.bucket} does not exist. Run npm run media:migrate first.`);
  process.exit(1);
}

if (!bucket.public) {
  console.error(`Bucket ${config.bucket} is not public.`);
  process.exit(1);
}

const storage = supabase.storage.from(config.bucket);
const remoteObjects = await listRemoteObjects(storage);
const remoteByPath = new Map(
  remoteObjects.map((object) => [object.objectPath, object]),
);
const expectedPaths = new Set(manifest.files.map((file) => file.storagePath));
const eligibleFiles = manifest.files.filter(
  (file) => migrationDecision(file).status === "UPLOAD",
);
const skippedSizeLimit = manifest.files.filter(
  (file) => migrationDecision(file).status === "SKIPPED_SIZE_LIMIT",
);
const localByStoragePath = new Map(
  inventory.files.map((file) => [file.storagePath, file]),
);
const failures = [];
let accessible = 0;
let sizeMatched = 0;

for (const file of skippedSizeLimit) {
  const localFile = localByStoragePath.get(file.storagePath);

  if (!localFile) {
    failures.push(`${file.storagePath}: required local fallback is missing`);
  } else if (localFile.bytes !== file.bytes) {
    failures.push(
      `${file.storagePath}: local fallback size mismatch, expected ${formatBytes(file.bytes)}, found ${formatBytes(localFile.bytes)}`,
    );
  }
}

for (const file of eligibleFiles) {
  const remoteObject = remoteByPath.get(file.storagePath);

  if (!remoteObject) {
    failures.push(`${file.storagePath}: missing from Storage`);
    continue;
  }

  const storedSize = remoteObjectSize(remoteObject);

  if (storedSize !== file.bytes) {
    failures.push(
      `${file.storagePath}: size mismatch, local ${formatBytes(file.bytes)}, remote ${formatBytes(storedSize)}`,
    );
    continue;
  }

  sizeMatched += 1;

  try {
    const url = publicObjectUrl(
      config.supabaseUrl,
      config.bucket,
      file.storagePath,
    );
    await verifyPublicResponse(file, url);
    accessible += 1;
  } catch (error) {
    failures.push(`${file.storagePath}: ${error.message}`);
  }
}

const remoteOnly = remoteObjects
  .map((object) => object.objectPath)
  .filter((objectPath) => !expectedPaths.has(objectPath));

remoteOnly.forEach((objectPath) => {
  failures.push(`${objectPath}: exists remotely but has no local counterpart`);
});

console.log("\nVerification summary");
console.log(`Local objects: ${inventory.files.length}`);
console.log(`Manifest objects: ${manifest.files.length}`);
console.log(`Expected remote objects: ${eligibleFiles.length}`);
console.log(`Skipped > 50 MiB (SKIPPED_SIZE_LIMIT): ${skippedSizeLimit.length}`);
console.log(`Remote objects: ${remoteObjects.length}`);
console.log(`Size matched: ${sizeMatched}`);
console.log(`Publicly accessible: ${accessible}`);
console.log(`Failed: ${failures.length}`);
console.log(`Verification: ${failures.length === 0 ? "PASS" : "FAIL"}`);

if (failures.length > 0) {
  console.error("\nVerification failures:");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exitCode = 1;
}

async function verifyPublicResponse(file, url) {
  if (file.kind === "video") {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-1023" },
    });

    await response.body?.cancel();

    if (response.status !== 206) {
      throw new Error(
        `public range request returned HTTP ${response.status}; expected 206`,
      );
    }

    const contentRange = response.headers.get("content-range");
    const totalBytes = contentRange?.match(/\/(\d+)$/)?.[1];

    if (!totalBytes || Number(totalBytes) !== file.bytes) {
      throw new Error(
        `public Content-Range size is ${totalBytes ?? "missing"}; expected ${file.bytes}`,
      );
    }

    return;
  }

  const response = await fetch(url, { method: "HEAD" });

  if (!response.ok) {
    throw new Error(`public URL returned HTTP ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) !== file.bytes) {
    throw new Error(
      `public Content-Length is ${contentLength}; expected ${file.bytes}`,
    );
  }
}
