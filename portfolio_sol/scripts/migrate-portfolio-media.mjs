import { createReadStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { FileUrlStorage, Upload } from "tus-js-client";
import {
  bucketFileSizeLimit,
  createAdminClient,
  ensurePublicBucket,
  findRemoteObject,
  formatBytes,
  formatLargestVideo,
  LARGE_FILE_THRESHOLD,
  loadMigrationEnv,
  migrationDecision,
  migrationConfig,
  printInventory,
  remoteObjectSize,
  scanPortfolioMedia,
  TUS_CHUNK_SIZE,
  tusRequestConfig,
} from "./lib/portfolio-media.mjs";

const projectRoot = process.cwd();
loadMigrationEnv(projectRoot);

const inventory = await scanPortfolioMedia();
printInventory(inventory);

if (process.argv.includes("--dry-run")) {
  console.log("\nDry run complete. No remote changes were made.");
  process.exit(0);
}

let config;

try {
  config = migrationConfig();
} catch (error) {
  console.error(`\nMigration not started: ${error.message}`);
  process.exit(1);
}

const supabase = createAdminClient(config);
const { bucket, created } = await ensurePublicBucket(supabase, config.bucket);
const storage = supabase.storage.from(config.bucket);
const fileSizeLimit = bucketFileSizeLimit(bucket);

console.log(
  `\nBucket: ${config.bucket} (${created ? "created" : "reused"}, public)`,
);
console.log(
  `Bucket file size limit: ${
    fileSizeLimit ? formatBytes(fileSizeLimit) : "not restricted at bucket level"
  }`,
);
console.log(
  "The project-wide Storage limit is enforced by Supabase and will be reported per file if it rejects an upload.",
);

const cacheDirectory = path.join(projectRoot, ".cache");
const tusUrlStoragePath = path.join(
  cacheDirectory,
  "portfolio-media-tus-uploads.json",
);
await mkdir(cacheDirectory, { recursive: true });

const summary = {
  failed: 0,
  found: inventory.files.length,
  skippedExisting: 0,
  skippedSizeLimit: 0,
  uploaded: 0,
};
const failures = [];

for (const file of inventory.files) {
  const decision = migrationDecision(file);

  console.log(`\nUploading: ${file.storagePath}`);
  console.log(`Size: ${formatBytes(file.bytes)}`);
  console.log(`Strategy: ${decision.strategy}`);

  if (decision.status === "SKIPPED_SIZE_LIMIT") {
    summary.skippedSizeLimit += 1;
    console.log("Result: SKIPPED_SIZE_LIMIT (Free plan: files > 50 MiB remain local)");
    continue;
  }

  try {
    const existingObject = await findRemoteObject(storage, file.storagePath);

    if (existingObject) {
      const existingSize = remoteObjectSize(existingObject);

      if (existingSize === file.bytes) {
        summary.skippedExisting += 1;
        console.log("Result: skipped (existing object has the same size)");
        continue;
      }

      throw new Error(
        `Object already exists with ${formatBytes(existingSize)}; expected ${formatBytes(file.bytes)}. ` +
          "Refusing to overwrite it.",
      );
    }

    if (fileSizeLimit && file.bytes > fileSizeLimit) {
      throw new Error(
        `Bucket limit is ${formatBytes(fileSizeLimit)}; this original requires at least ${formatBytes(file.bytes)}.`,
      );
    }

    if (file.bytes > LARGE_FILE_THRESHOLD) {
      const signedToken = await createSignedUploadToken(storage, file.storagePath);
      await uploadResumable(file, config, signedToken, tusUrlStoragePath);
    } else {
      await uploadStandard(storage, file);
    }

    const uploadedObject = await waitForRemoteObject(storage, file.storagePath);
    const uploadedSize = remoteObjectSize(uploadedObject);

    if (uploadedSize !== file.bytes) {
      throw new Error(
        `Post-upload size mismatch: remote ${formatBytes(uploadedSize)}, local ${formatBytes(file.bytes)}.`,
      );
    }

    summary.uploaded += 1;
    console.log("Result: uploaded and size-checked");
  } catch (error) {
    summary.failed += 1;
    failures.push({ file: file.storagePath, message: error.message });
    console.error(`Result: failed — ${error.message}`);
  }
}

console.log("\nMigration summary");
console.log(`Found: ${summary.found}`);
console.log(`Uploaded: ${summary.uploaded}`);
console.log(`Skipped existing: ${summary.skippedExisting}`);
console.log(`Skipped > 50 MiB (SKIPPED_SIZE_LIMIT): ${summary.skippedSizeLimit}`);
console.log(`Failed: ${summary.failed}`);
console.log(`Images: ${inventory.images.length}`);
console.log(`Videos: ${inventory.videos.length}`);
console.log(`Videos > 50 MiB: ${inventory.videosOver50MiB.length}`);
console.log(`Largest video: ${formatLargestVideo(inventory.largestVideo)}`);

if (failures.length > 0) {
  console.error("\nFailed objects:");
  failures.forEach(({ file, message }) => console.error(`  - ${file}: ${message}`));
  process.exitCode = 1;
}

async function uploadStandard(storageClient, file) {
  const body = await readFile(file.absolutePath);

  await withRetries(async () => {
    const { error } = await storageClient.upload(file.storagePath, body, {
      cacheControl: "31536000",
      contentType: file.contentType,
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }
  });
}

async function createSignedUploadToken(storageClient, objectPath) {
  const { data, error } = await storageClient.createSignedUploadUrl(objectPath, {
    upsert: false,
  });

  if (error || !data?.token) {
    throw new Error(
      `Unable to create signed upload token: ${error?.message ?? "token missing"}`,
    );
  }

  return data.token;
}

async function uploadResumable(
  file,
  { bucket, secretKey, supabaseUrl },
  signedToken,
  urlStoragePath,
) {
  const stream = createReadStream(file.absolutePath);
  const urlStorage = new FileUrlStorage(urlStoragePath);
  const request = tusRequestConfig({ secretKey, signedToken, supabaseUrl });
  let lastMilestone = -25;

  return new Promise((resolve, reject) => {
    const upload = new Upload(stream, {
      chunkSize: TUS_CHUNK_SIZE,
      endpoint: request.endpoint,
      headers: request.headers,
      metadata: {
        bucketName: bucket,
        cacheControl: "31536000",
        contentType: file.contentType,
        objectName: file.storagePath,
      },
      onError(error) {
        stream.destroy();
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percentage = Math.min(100, (bytesUploaded / bytesTotal) * 100);
        const milestone = Math.floor(percentage / 25) * 25;

        if (milestone > lastMilestone) {
          lastMilestone = milestone;
          console.log(`Progress: ${milestone}%`);
        }
      },
      onSuccess() {
        resolve();
      },
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      uploadSize: file.bytes,
      urlStorage,
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          console.log("Resuming a previous TUS upload.");
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }

        upload.start();
      })
      .catch(reject);
  });
}

async function waitForRemoteObject(storageClient, objectPath) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const object = await findRemoteObject(storageClient, objectPath);

    if (object) {
      return object;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw new Error("Upload completed, but the object was not visible in Storage listing.");
}

async function withRetries(operation) {
  const delays = [0, 1000, 3000];
  let lastError;

  for (const delay of delays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
