import { describe, expect, it, vi, beforeEach } from "vitest";
import { createWebImageVariants } from "./imageVariants";
import { createPortfolioAdminService } from "./portfolioAdminService";
import { createEmptyAdminDraft, createPendingItem, createPendingEdition, createPendingEditionSection } from "./adminDraft";

vi.mock("./imageVariants", () => ({ createWebImageVariants: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

function fixture({ isNew = false, failSave = false, failVariant = false } = {}) {
  const calls = [];
  const upload = vi.fn(async (path) => {
    calls.push(`upload:${path}`);
    return { error: failVariant && path.endsWith("-web-1080.webp") ? new Error("Storage unavailable") : null };
  });
  const remove = vi.fn(async (paths) => { calls.push(`remove:${paths.join(",")}`); return { error: null }; });
  const rpc = vi.fn(async () => { calls.push("save"); return { error: failSave ? new Error("save failed") : null }; });
  const from = () => {
    const query = {
      select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }), insert: () => query,
      single: async () => ({ data: { id: "new-client" }, error: null }),
      delete: () => query,
    };
    return query;
  };
  const service = createPortfolioAdminService({ storage: { from: () => ({ upload, remove }) }, rpc, from });
  const file = new File(["original"], "design.jpg", { type: "image/jpeg" });
  const item = createPendingItem(file, "post", { width: 1080, height: 1350 });
  const draft = { ...createEmptyAdminDraft(), id: isNew ? null : "client-id", slug: "future-client",
    storagePrefix: "future-client", name: "Future client", year: "2026", discipline: "Design", posts: [item] };
  createWebImageVariants.mockResolvedValue([720, 1080].map((width) => ({ width, height: width * 1.25,
    blob: new Blob(["variant"], { type: "image/webp" }) })));
  return { service, file, item, draft, upload, remove, rpc, calls };
}

describe("central Admin image pipeline", () => {
  it("keeps the original and saves no missing variants when a variant upload fails", async () => {
    const f = fixture({ failVariant: true });
    await f.service.saveClient(f.draft);
    const media = f.rpc.mock.calls[0][1].p_payload.sections[0].items[0];
    expect(media.storage_path).toBe(f.upload.mock.calls[0][0]);
    expect(media.config.webVariants).toBeUndefined();
    expect(f.remove).toHaveBeenCalledWith([f.upload.mock.calls[1][0]]);
    expect(f.remove.mock.calls.flat(2)).not.toContain(media.storage_path);
  });

  it.each([false, true])("automatically optimizes uploads for a client (new=%s)", async (isNew) => {
    const f = fixture({ isNew });
    await f.service.saveClient(f.draft);
    expect(createWebImageVariants).toHaveBeenCalledWith(f.file);
    expect(f.upload).toHaveBeenCalledTimes(3);
    const media = f.rpc.mock.calls[0][1].p_payload.sections[0].items[0];
    expect(media.config.webVariants.map((v) => v.width)).toEqual([720, 1080]);
    expect(f.upload.mock.calls.every(([, , options]) => options.upsert === false)).toBe(true);
  });

  it("inherits the pipeline for a new section in a new edition", async () => {
    const f = fixture();
    const edition = createPendingEdition();
    const section = createPendingEditionSection("customMedia");
    section.title = "Future section";
    section.items = [f.item];
    edition.sections = [section];
    f.draft.posts = [];
    f.draft.usesEditions = true;
    f.draft.editionDrafts = [edition];
    await f.service.saveClient(f.draft);
    const media = f.rpc.mock.calls[0][1].p_payload.editions[0].sections[0].items[0];
    expect(media.config.webVariants).toHaveLength(2);
    expect(media.storage_path).toContain("/ediciones/");
  });

  it("keeps the original when encoding fails", async () => {
    const f = fixture();
    createWebImageVariants.mockRejectedValue(new Error("encoder failed"));
    await f.service.saveClient(f.draft);
    expect(f.upload).toHaveBeenCalledOnce();
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls[0][1].p_payload.sections[0].items[0].config.webVariants).toBeUndefined();
  });

  it("cleans old original and variants only after a replacement is committed", async () => {
    const f = fixture();
    f.item.replacedStoragePath = "future-client/posts/old.jpg";
    f.item.replacedVariantPaths = ["future-client/posts/old-web-720.webp"];
    await f.service.saveClient(f.draft);
    expect(f.remove).toHaveBeenCalledWith([f.item.replacedStoragePath, ...f.item.replacedVariantPaths]);
    expect(f.calls.indexOf("save")).toBeLessThan(f.calls.findIndex((call) => call.startsWith("remove:")));
    expect(f.rpc.mock.calls[0][1].p_payload.sections[0].items[0].config.webVariants).toHaveLength(2);
  });

  it("rolls back only the new files when replacement metadata fails", async () => {
    const f = fixture({ failSave: true });
    f.item.replacedStoragePath = "future-client/posts/old.jpg";
    f.item.replacedVariantPaths = ["future-client/posts/old-web-720.webp"];
    await expect(f.service.saveClient(f.draft)).rejects.toThrow("save failed");
    expect(f.remove).toHaveBeenCalledWith(f.upload.mock.calls.map(([path]) => path));
    expect(f.remove.mock.calls.flat(2)).not.toContain(f.item.replacedStoragePath);
  });

  it("cleans original and variants of a removed media item after committing", async () => {
    const f = fixture();
    f.draft.posts = [{ ...f.item, existing: true, removed: true, storagePath: "future-client/posts/old.jpg",
      config: { webVariants: [{ width: 720, path: "future-client/posts/old-web-720.webp" }] } }];
    await f.service.saveClient(f.draft);
    expect(f.upload).not.toHaveBeenCalled();
    expect(f.remove).toHaveBeenCalledWith(["future-client/posts/old.jpg", "future-client/posts/old-web-720.webp"]);
    expect(f.calls[0]).toBe("save");
  });
});
