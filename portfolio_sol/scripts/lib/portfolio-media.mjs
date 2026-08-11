import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

export const BUCKET_NAME = "portfolio-media";
export const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024;
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024;
export const FIFTY_MIB = 50 * 1024 * 1024;

export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);
export const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
export const MEDIA_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
]);

const CLIENT_STORAGE_PATHS = new Map([
  ["aqualand", "aqualand"],
  ["desnac", "desnac"],
  ["maja", "maja"],
  ["peumax", "peumax"],
  ["rambla", "rambla"],
  ["sistemas moviles", "sistemas-moviles"],
  ["tardeo", "tardeo"],
  ["tori", "tori"],
  ["vectus", "vectus"],
]);

const MIME_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mov", "video/quicktime"],
]);

export function loadMigrationEnv(projectRoot = process.cwd()) {
  for (const fileName of [".env.migration", ".env.local", ".env"]) {
    const filePath = path.join(projectRoot, fileName);

    if (existsSync(filePath)) {
      loadEnvFile(filePath);
    }
  }
}

export function migrationConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const bucket =
    process.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || BUCKET_NAME;

  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !secretKey && "SUPABASE_SECRET_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing server-only migration credentials: ${missing.join(", ")}. ` +
        "Add them to .env.migration; never prefix the secret key with VITE_.",
    );
  }

  if (bucket !== BUCKET_NAME) {
    throw new Error(
      `VITE_SUPABASE_STORAGE_BUCKET must be ${BUCKET_NAME}; received ${bucket}.`,
    );
  }

  return { bucket, secretKey, supabaseUrl };
}

export function createAdminClient({ secretKey, supabaseUrl }) {
  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function migrationDecision(file) {
  if (file.bytes > FIFTY_MIB) {
    return { status: "SKIPPED_SIZE_LIMIT", strategy: "none" };
  }

  return {
    status: "UPLOAD",
    strategy:
      file.bytes > LARGE_FILE_THRESHOLD ? "resumable (TUS)" : "standard",
  };
}

export function assertManifestSafeToWrite({ existingCount, nextCount }) {
  if (Number.isInteger(existingCount) && nextCount < existingCount) {
    throw new Error(
      `Refusing to shrink the portfolio media manifest from ${existingCount} to ${nextCount} files. ` +
        "Generate it before cleanup, or remove the existing manifest intentionally before rebuilding it.",
    );
  }
}

export async function scanPortfolioMedia(
  mediaRoot = path.resolve(process.cwd(), "public", "portfolio"),
) {
  const files = [];
  const unsupported = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const localPath = toPosixPath(path.relative(mediaRoot, absolutePath));
      const extension = path.extname(entry.name).toLowerCase();

      if (!MEDIA_EXTENSIONS.has(extension)) {
        unsupported.push(localPath);
        continue;
      }

      const storagePath = toStoragePath(localPath);
      const fileStat = await stat(absolutePath);
      const kind = VIDEO_EXTENSIONS.has(extension) ? "video" : "image";

      files.push({
        absolutePath,
        bytes: fileStat.size,
        contentType: MIME_TYPES.get(extension),
        extension,
        kind,
        localPath,
        storagePath,
      });
    }
  }

  if (!existsSync(mediaRoot)) {
    throw new Error(`Local media directory not found: ${mediaRoot}`);
  }

  await walk(mediaRoot);

  const images = files.filter((file) => file.kind === "image");
  const videos = files.filter((file) => file.kind === "video");
  const videosOver50MiB = videos.filter((file) => file.bytes > FIFTY_MIB);
  const largestVideo = [...videos].sort((a, b) => b.bytes - a.bytes)[0] ?? null;
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  return {
    files,
    images,
    largestVideo,
    mediaRoot,
    totalBytes,
    unsupported,
    videos,
    videosOver50MiB,
  };
}

export function printInventory(inventory, { includeVideos = false } = {}) {
  console.log(`Total files: ${inventory.files.length}`);
  console.log(`Total size: ${formatBytes(inventory.totalBytes)}`);
  console.log(`Images: ${inventory.images.length}`);
  console.log(`Videos: ${inventory.videos.length}`);
  console.log(`Videos > 50 MiB: ${inventory.videosOver50MiB.length}`);
  console.log(
    `Largest video: ${
      inventory.largestVideo
        ? `${inventory.largestVideo.storagePath} (${formatBytes(inventory.largestVideo.bytes)})`
        : "none"
    }`,
  );

  if (inventory.unsupported.length > 0) {
    console.log(`Unsupported files ignored: ${inventory.unsupported.length}`);
    inventory.unsupported.forEach((file) => console.log(`  - ${file}`));
  }

  if (includeVideos) {
    console.log("\nVideos:");
    inventory.videos.forEach((file) => {
      const marker = file.bytes > FIFTY_MIB ? " [> 50 MiB]" : "";
      console.log(`  - ${file.storagePath}: ${formatBytes(file.bytes)}${marker}`);
    });
  }
}

export async function ensurePublicBucket(supabase, bucketName) {
  let bucket = await findBucket(supabase, bucketName);
  let created = false;

  if (!bucket) {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });

    if (error) {
      throw new Error(`Unable to create bucket ${bucketName}: ${error.message}`);
    }

    bucket = { ...data, id: bucketName, public: true };
    created = true;
  } else if (!bucket.public) {
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
      public: true,
    });

    if (error) {
      throw new Error(`Unable to make bucket ${bucketName} public: ${error.message}`);
    }

    bucket = { ...bucket, ...data, public: true };
  }

  return { bucket, created };
}

export async function findBucket(supabase, bucketName) {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(`Unable to list Storage buckets: ${error.message}`);
  }

  return buckets.find((candidate) => candidate.id === bucketName) ?? null;
}

export async function findRemoteObject(storage, objectPath) {
  const lastSlash = objectPath.lastIndexOf("/");
  const directory = lastSlash === -1 ? "" : objectPath.slice(0, lastSlash);
  const fileName = lastSlash === -1 ? objectPath : objectPath.slice(lastSlash + 1);
  const { data, error } = await storage.list(directory, {
    limit: 100,
    search: fileName,
  });

  if (error) {
    throw new Error(`Unable to inspect ${objectPath}: ${error.message}`);
  }

  return data.find((entry) => entry.id !== null && entry.name === fileName) ?? null;
}

export async function listRemoteObjects(storage, prefix = "") {
  const objects = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await storage.list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(
        `Unable to list bucket path ${prefix || "/"}: ${error.message}`,
      );
    }

    for (const entry of data) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.id === null) {
        objects.push(...(await listRemoteObjects(storage, objectPath)));
      } else {
        objects.push({ ...entry, objectPath });
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return objects;
}

export function remoteObjectSize(remoteObject) {
  const value = remoteObject?.metadata?.size;
  const size = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return Number.isFinite(size) ? size : null;
}

export function publicObjectUrl(supabaseUrl, bucket, objectPath) {
  const encodedPath = objectPath.split("/").map(encodePathSegment).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function tusRequestConfig({ secretKey, signedToken, supabaseUrl }) {
  return {
    endpoint: `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/upload/resumable`,
    headers: {
      apikey: secretKey,
      "x-signature": signedToken,
    },
  };
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown";
  }

  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(3)} GiB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(3)} MiB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${bytes} B`;
}

export function formatLargestVideo(video) {
  return video
    ? `${video.storagePath} (${formatBytes(video.bytes)})`
    : "none";
}

export function bucketFileSizeLimit(bucket) {
  const rawLimit = bucket?.file_size_limit;
  const limit = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : rawLimit;
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function toStoragePath(localPath) {
  const [localClientDirectory, ...relativeParts] = localPath.split("/");
  const storageClientDirectory = CLIENT_STORAGE_PATHS.get(localClientDirectory);

  if (!storageClientDirectory) {
    throw new Error(
      `Refusing to migrate unapproved client directory: ${localClientDirectory}`,
    );
  }

  if (relativeParts.length === 0) {
    throw new Error(`Media file is not inside a client directory: ${localPath}`);
  }

  return [storageClientDirectory, ...relativeParts].join("/");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function encodePathSegment(segment) {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}
