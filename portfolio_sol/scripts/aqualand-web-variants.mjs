import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createAdminClient, loadMigrationEnv, migrationConfig } from "./lib/portfolio-media.mjs";

const directory = path.resolve("output/playwright/aqualand-backfill");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const save = async (name, value) => writeFile(path.join(directory, name), JSON.stringify(value, null, 2));
const read = async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"));
const ordered = (rows) => [...rows].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

export function selectPilotItems(client) {
  assert.equal(client.slug, "aqualand");
  assert.equal(client.storage_prefix, "aqualand");
  assert.equal(client.published, true);
  return ordered(client.portfolio_sections).flatMap((section) => {
    if (section.edition_id) return [];
    let rows = [];
    if (section.section_type === "storySequence") {
      rows = ordered(section.portfolio_media_items).filter((item) => item.media_kind === "story")
        .map((item, index) => ({ ...item, pilotLabel: `Story ${index + 1}` }));
    } else if (section.section_type === "carouselPairs") {
      rows = ordered(section.portfolio_media_groups).filter((group) => group.group_kind === "carousel")
        .flatMap((group, row) => ordered(group.portfolio_media_items)
          .filter((item) => item.media_kind === "carouselSlide")
          .map((item, index) => ({ ...item, pilotLabel: `Carousel ${String.fromCharCode(65 + row)} ${index + 1}` })));
    }
    return rows.map((item) => {
      assert.match(item.storage_path, /^aqualand\/(stories|carruseles)\//);
      assert(!item.storage_path.split("/").some((segment) => !segment || segment === "." || segment === ".."));
      assert(["image/jpeg", "image/png"].includes(item.mime_type));
      return { ...item, pilotSection: section.section_type };
    });
  });
}

export function addVerifiedVariants(item, variants) {
  assert(variants.length > 0);
  for (const variant of variants) {
    assert.equal(variant.verified, true);
    assert.equal(variant.visualPass, true);
    assert(variant.bytes > 0 && variant.width > 0 && variant.height > 0);
    assert.notEqual(variant.path, item.storage_path);
    assert(variant.path.startsWith(`${path.posix.dirname(item.storage_path)}/`));
    assert(!variant.path.split("/").some((segment) => !segment || segment === "." || segment === ".."));
  }
  return { ...item.config, webVariants: variants.map(({ width, path: objectPath }) => ({ width, path: objectPath })) };
}

async function main() {
  const mode = process.argv[2];
  assert(["inventory", "generate", "apply", "verify"].includes(mode), "Use inventory, generate, apply or verify.");
  await mkdir(directory, { recursive: true });
  loadMigrationEnv();
  const config = migrationConfig();
  const client = createAdminClient(config);
  const storage = client.storage.from(config.bucket);
  const objectUrl = (objectPath) => storage.getPublicUrl(objectPath).data.publicUrl;
  const download = async (objectPath) => {
    const response = await fetch(objectUrl(objectPath));
    assert(response.ok, `Download failed: ${objectPath} (${response.status})`);
    return { bytes: Buffer.from(await response.arrayBuffer()), headers: Object.fromEntries(response.headers) };
  };
  const query = await client.from("portfolio_clients")
    .select("*,portfolio_sections(*,portfolio_media_items(*),portfolio_media_groups(*,portfolio_media_items(*)))")
    .eq("slug", "aqualand").eq("published", true).single();
  if (query.error) throw query.error;
  const items = selectPilotItems(query.data);
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.PILOT_CHROMIUM_PATH || "C:/Users/Usuario/AppData/Local/ms-playwright/chromium-1237/chrome-win64/chrome.exe" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.goto(process.env.PILOT_ORIGIN || "http://127.0.0.1:5173/portfolio/aqualand");
    await page.waitForSelector("[data-story-slide] img");
    const dimensions = async (bytes, type) => page.evaluate(async ({ base64, type }) => {
      const bitmap = await globalThis.createImageBitmap(new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type }));
      const result = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return result;
    }, { base64: bytes.toString("base64"), type });
    if (mode === "inventory") {
      const metadata = await client.from("portfolio_media_items").select("*").order("id");
      if (metadata.error) throw metadata.error;
      await save("database-before.json", metadata.data);
      await save("client-before.json", query.data);
      const rendered = {};
      for (const [name, width, height] of [["mobile", 390, 844], ["desktop", 1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(1000);
        rendered[name] = await page.evaluate(() => ({
          story: globalThis.document.querySelector("[data-story-slide] img").getBoundingClientRect().toJSON(),
          carousel: globalThis.document.querySelector("[data-carousel-slide] img").getBoundingClientRect().toJSON(),
        }));
      }
      const inventory = [];
      for (const item of items) {
        const original = await download(item.storage_path);
        const size = await dimensions(original.bytes, item.mime_type);
        await writeFile(path.join(directory, `${item.id}-original`), original.bytes);
        const existing = [];
        for (const variant of item.config?.webVariants ?? []) {
          try {
            const resource = await download(variant.path);
            const actual = await dimensions(resource.bytes, "image/webp");
            existing.push({ ...variant, valid: actual.width === variant.width && actual.width <= size.width,
              bytes: resource.bytes.length, ...actual });
          } catch { existing.push({ ...variant, valid: false }); }
        }
        const entry = { ...item, original: { ...size, bytes: original.bytes.length, sha256: sha256(original.bytes), headers: original.headers },
          existing, needsBackfill: !existing.some((v) => v.valid), rendered };
        inventory.push(entry);
        console.log(JSON.stringify({ id: item.id, section: item.pilotLabel, storage_path: item.storage_path,
          dimensions: `${size.width}x${size.height}`, bytes: entry.original.bytes, webVariants: existing,
          renderMobile: rendered.mobile[item.pilotSection === "storySequence" ? "story" : "carousel"].width,
          renderDesktop: rendered.desktop[item.pilotSection === "storySequence" ? "story" : "carousel"].width }));
      }
      await save("inventory.json", inventory);
      console.log(`Backfill required: ${inventory.filter((item) => item.needsBackfill).length}/${inventory.length}`);
      return;
    }
    const inventory = await read("inventory.json");
    assert.deepEqual(items.map((item) => item.id), inventory.map((item) => item.id), "Pilot membership changed.");
    if (mode === "generate") {
      const generated = [];
      for (const item of inventory.filter((item) => item.needsBackfill)) {
        const bytes = await readFile(path.join(directory, `${item.id}-original`));
        assert.equal(sha256(bytes), item.original.sha256);
        const variants = await page.evaluate(async ({ base64, item }) => {
          const { createWebImageVariants } = await import("/src/admin/imageVariants.js");
          const { variantPath } = await import("/src/admin/portfolioAdminService.js");
          const file = new File([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], item.storage_path.split("/").at(-1), { type: item.mime_type });
          const variants = await createWebImageVariants(file);
          const result = [];
          for (const variant of variants) {
            const bytes = new Uint8Array(await variant.blob.arrayBuffer());
            let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
            result.push({ width: variant.width, height: variant.height, bytes: variant.blob.size,
              type: variant.blob.type, path: variantPath(item.storage_path, variant.width), base64: btoa(binary) });
          }
          return result;
        }, { base64: bytes.toString("base64"), item });
        const records = [];
        for (const { base64, ...variant } of variants) {
          assert.equal(variant.type, "image/webp");
          assert(variant.width <= item.original.width);
          const data = Buffer.from(base64, "base64");
          assert.equal(data.length, variant.bytes);
          assert.deepEqual(await dimensions(data, variant.type), { width: variant.width, height: variant.height });
          const localFile = `${item.id}-${variant.width}.webp`;
          await writeFile(path.join(directory, localFile), data);
          records.push({ ...variant, localFile, sha256: sha256(data), visualPass: false });
        }
        generated.push({ id: item.id, variants: records });
        await save("generated.json", generated);
        console.log(`${item.pilotLabel}: ${records.map((v) => `${v.width}px/${v.bytes}B`).join(", ")}`);
      }
      return;
    }
    if (mode === "apply") {
      const generated = await read("generated.json");
      // Visual approval records refer to the exact local bytes reviewed before publication.
      const applied = [];
      for (const item of inventory.filter((item) => item.needsBackfill)) {
        const current = items.find((row) => row.id === item.id);
        assert.deepEqual(current.config, item.config, "Concurrent metadata change; refusing to overwrite.");
        const originals = await download(item.storage_path);
        assert.equal(sha256(originals.bytes), item.original.sha256);
        const variants = generated.find((row) => row.id === item.id)?.variants;
        assert(variants?.length > 0);
        const verified = [];
        for (const variant of variants) {
          assert.equal(variant.visualPass, true, `Visual review required: ${variant.localFile}`);
          const bytes = await readFile(path.join(directory, variant.localFile));
          assert.equal(sha256(bytes), variant.sha256);
          const expectedPath = await page.evaluate(async ({ original, width }) => {
            const { variantPath } = await import("/src/admin/portfolioAdminService.js"); return variantPath(original, width);
          }, { original: item.storage_path, width: variant.width });
          assert.equal(variant.path, expectedPath);
          assert.notEqual(variant.path, item.storage_path);
          const { data: objects, error: listError } = await storage.list(path.posix.dirname(variant.path), { search: path.posix.basename(variant.path) });
          if (listError) throw listError;
          if (!objects.some((object) => object.name === path.posix.basename(variant.path))) {
            const upload = await storage.upload(variant.path, bytes, { cacheControl: "31536000", contentType: "image/webp", upsert: false });
            if (upload.error) throw upload.error;
          }
          // Reuse only an object whose bytes match the reviewed version exactly.
          const publicFile = await download(variant.path);
          assert.equal(sha256(publicFile.bytes), variant.sha256);
          assert.equal(publicFile.bytes.length, variant.bytes);
          assert.deepEqual(await dimensions(publicFile.bytes, "image/webp"), { width: variant.width, height: variant.height });
          verified.push({ ...variant, verified: true, headers: publicFile.headers });
        }
        const nextConfig = addVerifiedVariants(item, verified);
        const update = await client.from("portfolio_media_items").update({ config: nextConfig })
          .eq("id", item.id).eq("storage_path", item.storage_path).eq("config", JSON.stringify(item.config))
          .select("id,config").single();
        if (update.error) throw update.error;
        assert.deepEqual(update.data.config, nextConfig);
        applied.push({ id: item.id, originalPath: item.storage_path, variants: verified });
        await save("applied.json", applied);
        console.log(`Applied: ${item.pilotLabel}`);
      }
    }
    const before = await read("database-before.json");
    const afterQuery = await client.from("portfolio_media_items").select("*").order("id");
    if (afterQuery.error) throw afterQuery.error;
    const ids = new Set(inventory.filter((item) => item.needsBackfill).map((item) => item.id));
    const normalize = (rows) => rows.map((row) => {
      if (!ids.has(row.id)) return row;
      const baseline = before.find((item) => item.id === row.id);
      const { webVariants: variants, ...config } = row.config;
      assert(variants?.length > 0);
      assert.deepEqual(config, baseline.config);
      return { ...row, config: baseline.config, updated_at: baseline.updated_at };
    });
    assert.deepEqual(normalize(afterQuery.data), before, "Fields outside the authorized config changed.");
    for (const item of inventory) {
      const original = await download(item.storage_path);
      assert.equal(sha256(original.bytes), item.original.sha256);
    }
    await save("integrity.json", { originalHashesUnchanged: inventory.length, mediaRowsUnchangedExceptPilotVariants: before.length, verifiedAt: new Date().toISOString() });
    console.log(`Verified ${inventory.length} original SHA-256 hashes and ${before.length} media rows.`);
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
