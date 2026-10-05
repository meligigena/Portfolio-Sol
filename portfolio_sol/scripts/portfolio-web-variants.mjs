import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createAdminClient, loadMigrationEnv, migrationConfig } from "./lib/portfolio-media.mjs";

const TABLES = ["portfolio_clients", "portfolio_editions", "portfolio_sections", "portfolio_media_groups", "portfolio_media_items"];
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".bmp": "image/bmp" };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function assertImagePath(objectPath, prefix) {
  assert(typeof objectPath === "string" && objectPath.startsWith(`${prefix}/`), "Image outside its client prefix.");
  assert(!objectPath.includes("\\") && !objectPath.split("/").some((part) => !part || part === "." || part === ".."), "Unsafe image path.");
}

export function selectPublicImages(snapshot) {
  const clients = new Map(snapshot.portfolio_clients.filter((row) => row.published).map((row) => [row.id, row]));
  const editions = new Map(snapshot.portfolio_editions.map((row) => [row.id, row]));
  const sections = new Map(snapshot.portfolio_sections.map((row) => [row.id, row]));
  const groups = new Map(snapshot.portfolio_media_groups.map((row) => [row.id, row]));
  return snapshot.portfolio_media_items.flatMap((item) => {
    const section = sections.get(item.section_id ?? groups.get(item.group_id)?.section_id);
    const owner = clients.get(section?.client_id);
    if (!owner || (section.edition_id && !editions.has(section.edition_id))) return [];
    const mimeType = item.mime_type ?? TYPES[path.posix.extname(item.storage_path ?? "").toLowerCase()];
    if (!Object.values(TYPES).includes(mimeType) || item.media_kind === "video" || !item.storage_path) return [];
    assertImagePath(item.storage_path, owner.storage_prefix);
    return [{ ...item, mimeType, clientSlug: owner.slug, clientName: owner.name, storagePrefix: owner.storage_prefix,
      sectionType: section.section_type, editionId: section.edition_id }];
  });
}

export function addVerifiedVariants(item, variants) {
  assert(variants.length > 0);
  const paths = new Set();
  const widths = new Set();
  for (const variant of variants) {
    assert.equal(variant.verified, true);
    assert(variant.bytes > 0 && variant.width > 0 && variant.height > 0);
    assert.notEqual(variant.path, item.storage_path);
    assertImagePath(variant.path, item.storagePrefix);
    assert(!paths.has(variant.path) && !widths.has(variant.width), "Duplicate variants.");
    paths.add(variant.path); widths.add(variant.width);
  }
  return { ...item.config, webVariants: variants.map(({ width, path: objectPath }) => ({ width, path: objectPath })) };
}

async function snapshotDatabase(client) {
  const snapshot = {};
  for (const table of TABLES) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from(table).select("*").order("id").range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    snapshot[table] = rows;
  }
  return snapshot;
}

async function eachImage(rows, callback) {
  let index = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, async () => {
    while (index < rows.length) {
      try { await callback(rows[index++]); }
      catch (error) { failures.push(error); }
    }
  }));
  if (failures.length) throw new AggregateError(failures, failures.map((error) => error.message).join("; "));
}

async function main() {
  const mode = process.argv[2];
  assert(["plan", "apply", "verify"].includes(mode), "Use plan, apply or verify.");
  const directory = path.resolve(process.env.WEB_VARIANTS_OUTPUT || "output/playwright/portfolio-backfill");
  await mkdir(directory, { recursive: true });
  const save = async (name, value) => {
    const target = path.join(directory, name);
    await writeFile(`${target}.tmp`, JSON.stringify(value, null, 2));
    await rename(`${target}.tmp`, target);
  };
  const read = async (name, fallback) => {
    try { return JSON.parse(await readFile(path.join(directory, name), "utf8")); }
    catch (error) { if (error.code === "ENOENT" && fallback !== undefined) return fallback; throw error; }
  };
  loadMigrationEnv();
  const config = migrationConfig();
  const client = createAdminClient(config);
  const storage = client.storage.from(config.bucket);
  const download = async (objectPath) => {
    const response = await fetch(storage.getPublicUrl(objectPath).data.publicUrl, { signal: AbortSignal.timeout(45000) });
    assert(response.ok, `Download failed: ${objectPath} (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  };
  const exists = async (objectPath) => {
    const { data, error } = await storage.list(path.posix.dirname(objectPath), { search: path.posix.basename(objectPath), limit: 1000 });
    if (error) throw error;
    return data.some((object) => object.name === path.posix.basename(objectPath));
  };
  const snapshot = await snapshotDatabase(client);
  const items = selectPublicImages(snapshot);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PILOT_CHROMIUM_PATH || "C:/Users/Usuario/AppData/Local/ms-playwright/chromium-1237/chrome-win64/chrome.exe" });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.PILOT_ORIGIN || "http://127.0.0.1:5173");
    const dimensions = (bytes, type) => page.evaluate(async ({ base64, type }) => {
      const bitmap = await globalThis.createImageBitmap(new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type }));
      const size = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return size;
    }, { base64: bytes.toString("base64"), type });
    const verifyVariants = async (item, original, variants) => {
      const paths = new Set(), widths = new Set();
      assert(Array.isArray(variants) && variants.length > 0);
      const verified = [];
      for (const variant of variants) {
        assertImagePath(variant.path, item.storagePrefix);
        assert.notEqual(variant.path, item.storage_path);
        assert(Number.isInteger(variant.width) && variant.width > 0 && variant.width <= original.width);
        assert(!paths.has(variant.path) && !widths.has(variant.width));
        paths.add(variant.path); widths.add(variant.width);
        const bytes = await download(variant.path);
        const size = await dimensions(bytes, "image/webp");
        assert.equal(size.width, variant.width);
        assert.equal(size.height, Math.round(original.height * variant.width / original.width));
        assert(bytes.length < original.bytes * 0.9);
        if (variant.sha256) assert.equal(sha256(bytes), variant.sha256);
        verified.push({ ...variant, ...size, bytes: bytes.length, sha256: sha256(bytes), verified: true });
      }
      return verified;
    };

    if (mode === "plan") {
      const previous = await read("plan.json", { items: [] });
      const generatorHash = sha256(await readFile(path.resolve("src/admin/imageVariants.js")));
      const plan = { destination: config.supabaseUrl, bucket: config.bucket, generatorHash, createdAt: new Date().toISOString(), items: [], errors: [],
        excludedClientCovers: snapshot.portfolio_clients.map((row) => ({ slug: row.slug, path: row.logo_path, reason: "Direct client logo reference; does not use config.webVariants." })) };
      await save("database-before.json", snapshot);
      await save("applied.json", []);
      await save("errors.json", []);
      for (const item of items) {
        try {
          const bytes = await download(item.storage_path);
          const original = { ...await dimensions(bytes, item.mimeType), bytes: bytes.length, sha256: sha256(bytes) };
          const entry = { ...item, original, variants: [], status: "PENDING" };
          await writeFile(path.join(directory, `${item.id}-original`), bytes);
          try {
            entry.variants = await verifyVariants(item, original, item.config?.webVariants);
            entry.status = "ALREADY_VALID";
          } catch { /* Invalid or absent metadata requires the existing generator. */ }
          if (entry.status !== "ALREADY_VALID") {
            const cached = previous.generatorHash === generatorHash
              ? previous.items.find((row) => row.id === item.id && row.original?.sha256 === original.sha256) : null;
            if (cached?.status === "NO_BENEFIT") entry.status = "NO_BENEFIT";
            else {
              let reused = false;
              if (cached?.status === "READY") {
                try {
                  for (const variant of cached.variants) assert.equal(sha256(await readFile(path.join(directory, variant.localFile))), variant.sha256);
                  entry.variants = cached.variants;
                  reused = true;
                } catch { /* Missing or changed checkpoint assets must be regenerated. */ }
              }
              const generated = reused ? [] : await page.evaluate(async ({ base64, item }) => {
                const { createWebImageVariants } = await import("/src/admin/imageVariants.js");
                const { variantPath } = await import("/src/admin/portfolioAdminService.js");
                const file = new File([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], item.storage_path.split("/").at(-1), { type: item.mimeType });
                const variants = await createWebImageVariants(file);
                return Promise.all(variants.map(async (variant) => {
                  let binary = ""; for (const byte of new Uint8Array(await variant.blob.arrayBuffer())) binary += String.fromCharCode(byte);
                  return { width: variant.width, height: variant.height, bytes: variant.blob.size, path: variantPath(item.storage_path, variant.width), base64: btoa(binary) };
                }));
              }, { base64: bytes.toString("base64"), item });
              for (const { base64, ...variant } of generated) {
                const data = Buffer.from(base64, "base64");
                assert.equal(data.length, variant.bytes);
                assert(variant.bytes < original.bytes * 0.9 && variant.width <= original.width);
                assert.deepEqual(await dimensions(data, "image/webp"), { width: variant.width, height: variant.height });
                assert.equal(variant.height, Math.round(original.height * variant.width / original.width));
                // Canonical paths first; conflicting historical stems use a stable content suffix.
                if (await exists(variant.path) && sha256(await download(variant.path)) !== sha256(data)) {
                  variant.path = await page.evaluate(async ({ originalPath, hash, width }) => {
                    const { variantPath } = await import("/src/admin/portfolioAdminService.js");
                    const uniqueSource = originalPath.replace(/(\.[^/.]+)$/, `-${hash}$1`);
                    return variantPath(uniqueSource, width);
                  }, { originalPath: item.storage_path, hash: sha256(data).slice(0, 16), width: variant.width });
                  if (await exists(variant.path)) assert.equal(sha256(await download(variant.path)), sha256(data));
                }
                assertImagePath(variant.path, item.storagePrefix);
                const localFile = `${item.id}-${variant.width}.webp`;
                await writeFile(path.join(directory, localFile), data);
                entry.variants.push({ ...variant, localFile, sha256: sha256(data) });
              }
              entry.status = entry.variants.length ? "READY" : "NO_BENEFIT";
            }
          }
          plan.items.push(entry);
          console.log(`${item.clientSlug} ${item.id}: ${entry.status} (${entry.variants.length})`);
        } catch (error) {
          plan.errors.push({ id: item.id, client: item.clientSlug, path: item.storage_path, message: error.message });
          console.error(`${item.id}: ${error.message}`);
        }
        await save("plan.json", plan);
      }
      const ready = plan.items.filter((row) => row.status === "READY");
      const uploadMap = new Map();
      for (const item of ready) for (const variant of item.variants) {
        const previous = uploadMap.get(variant.path);
        if (previous) assert.equal(previous.sha256, variant.sha256, "Conflicting planned variants.");
        uploadMap.set(variant.path, variant);
      }
      await save("publication-plan.json", { destination: plan.destination, bucket: plan.bucket, uploads: [...uploadMap.values()],
        updates: ready.map((item) => ({ id: item.id, client: item.clientSlug, originalPath: item.storage_path, before: item.config,
          after: addVerifiedVariants(item, item.variants.map((variant) => ({ ...variant, verified: true }))) })) });
      console.log(JSON.stringify({ candidates: items.length, ready: ready.length, alreadyValid: plan.items.filter((row) => row.status === "ALREADY_VALID").length,
        noBenefit: plan.items.filter((row) => row.status === "NO_BENEFIT").length, variants: uploadMap.size, errors: plan.errors.length }));
      if (plan.errors.length) process.exitCode = 1;
      return;
    }

    const plan = await read("plan.json");
    assert.equal(plan.destination, config.supabaseUrl); assert.equal(plan.bucket, config.bucket);
    const baseline = await read("database-before.json");
    const applied = await read("applied.json", []);
    const errors = mode === "verify" ? await read("errors.json", []) : [];
    if (mode === "apply") {
      let checkpoint = Promise.resolve();
      const objectUploads = new Map();
      await eachImage(plan.items.filter((row) => row.status === "READY"), async (item) => {
        try {
          const { data: current, error } = await client.from("portfolio_media_items").select("*").eq("id", item.id).single();
          if (error) throw error;
          assert.equal(current.storage_path, item.storage_path);
          const originalBytes = await download(item.storage_path);
          assert.equal(sha256(originalBytes), item.original.sha256);
          const nextConfig = addVerifiedVariants(item, item.variants.map((variant) => ({ ...variant, verified: true })));
          if (JSON.stringify(current.config) !== JSON.stringify(item.config)) {
            assert.deepEqual(current.config, nextConfig, "Concurrent config edit; refusing to overwrite.");
            await verifyVariants(item, item.original, item.variants);
          } else {
            for (const variant of item.variants) {
              assertImagePath(variant.path, item.storagePrefix);
              const bytes = await readFile(path.join(directory, variant.localFile));
              assert.equal(sha256(bytes), variant.sha256);
              if (!objectUploads.has(variant.path)) {
                objectUploads.set(variant.path, (async () => {
                  if (!await exists(variant.path)) {
                    const upload = await storage.upload(variant.path, bytes, { cacheControl: "31536000", contentType: "image/webp", upsert: false });
                    if (upload.error) throw upload.error;
                  }
                })());
              }
              await objectUploads.get(variant.path);
            }
            const verified = await verifyVariants(item, item.original, item.variants);
            const update = await client.from("portfolio_media_items").update({ config: addVerifiedVariants(item, verified) })
              .eq("id", item.id).eq("storage_path", item.storage_path).eq("config", JSON.stringify(item.config))
              .select("config").single();
            if (update.error) throw update.error;
            assert.deepEqual(update.data.config, nextConfig);
          }
          if (!applied.some((row) => row.id === item.id)) applied.push({ id: item.id, client: item.clientSlug, original: item.original,
            originalPath: item.storage_path, variants: item.variants });
          // Serialize checkpoints even though unrelated media items are independent.
          const persisted = [...applied];
          checkpoint = checkpoint.then(() => save("applied.json", persisted));
          await checkpoint;
          console.log(`Applied: ${item.clientSlug} ${item.id}`);
        } catch (error) {
          errors.push({ id: item.id, client: item.clientSlug, message: error.message });
          console.error(`${item.id}: ${error.message}`);
        }
      });
    }
    await save("errors.json", errors);
    const after = await snapshotDatabase(client);
    const appliedIds = new Set(applied.map((row) => row.id));
    for (const table of TABLES) {
      const normalized = after[table].map((row) => {
        if (table !== "portfolio_media_items" || !appliedIds.has(row.id)) return row;
        const before = baseline[table].find((item) => item.id === row.id);
        const beforeConfig = { ...before.config };
        const afterConfig = { ...row.config };
        delete beforeConfig.webVariants;
        delete afterConfig.webVariants;
        assert.deepEqual(afterConfig, beforeConfig);
        return { ...row, config: before.config, updated_at: before.updated_at };
      });
      assert.deepEqual(normalized, baseline[table], `Unauthorized change in ${table}.`);
    }
    let originalHashes = 0, verifiedReferences = 0;
    await eachImage(plan.items, async (item) => {
      assert.equal(sha256(await download(item.storage_path)), item.original.sha256);
      originalHashes += 1;
      const current = after.portfolio_media_items.find((row) => row.id === item.id);
      if (item.status === "ALREADY_VALID" || appliedIds.has(item.id)) {
        const variants = await verifyVariants(item, item.original, current.config.webVariants);
        if (appliedIds.has(item.id)) assert.deepEqual(current.config.webVariants, item.variants.map(({ width, path }) => ({ width, path })));
        verifiedReferences += variants.length;
      }
    });
    const originalBytes = applied.reduce((sum, row) => sum + row.original.bytes, 0);
    const uniqueVariants = [...new Map(applied.flatMap((row) => row.variants).map((variant) => [variant.path, variant])).values()];
    const variantBytes = uniqueVariants.reduce((sum, row) => sum + row.bytes, 0);
    const smallestBytes = applied.reduce((sum, row) => sum + [...row.variants].sort((a, b) => a.width - b.width)[0].bytes, 0);
    const summary = { clients: [...new Set(applied.map((row) => row.client))].sort(), processedImages: applied.length,
      skippedExisting: plan.items.filter((row) => row.status === "ALREADY_VALID").length,
      skippedNoBenefit: plan.items.filter((row) => row.status === "NO_BENEFIT").length, newVariants: uniqueVariants.length,
      originalBytes, variantBytes, smallestVariantBytes: smallestBytes, approximateSelectedSaving: originalBytes ? 1 - smallestBytes / originalBytes : 0,
      originalHashesUnchanged: originalHashes, verifiedReferences, unchangedDatabaseTables: TABLES, errors: [...plan.errors, ...errors], verifiedAt: new Date().toISOString() };
    await save("summary.json", summary);
    console.log(JSON.stringify(summary));
    if (summary.errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
