import { describe, expect, it, vi } from "vitest";
import {
  assertScopedPaths,
  createPortfolioAdminService,
} from "./portfolioAdminService";
import { createEmptyAdminDraft } from "./adminDraft";

describe("admin destructive operations", () => {
  it("uploads new media under the canonical storagePrefix with explicit options", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const file = {
      name: "Nueva Imagen.JPG",
      type: "image/jpeg",
      size: 1024,
    };
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "public-slug",
      storagePrefix: "canonical-prefix",
      name: "Example",
      year: "2026",
      discipline: "Design",
      existingLogoPath: "legacy-logo-folder/logo.jpg",
      sortOrder: 0,
      posts: [
        {
          id: "new-post",
          existing: false,
          removed: false,
          file,
          name: file.name,
          type: "post",
          mimeType: file.type,
          alt: "",
          width: 1080,
          height: 1350,
          presentation: "raw",
        },
      ],
    };

    await service.saveClient(draft);

    expect(upload).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0][0]).toMatch(
      /^canonical-prefix\/posts\/.+-nueva-imagen\.jpg$/,
    );
    expect(upload.mock.calls[0][0]).not.toContain("legacy-logo-folder");
    expect(upload.mock.calls[0][1]).toBe(file);
    expect(upload.mock.calls[0][2]).toEqual({
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });
    expect(rpc).toHaveBeenCalledAfter(upload);
    expect(rpc.mock.calls[0][1].p_payload.client.sort_order).toBe(0);
  });

  it("creates a new client row before its first Storage upload", async () => {
    const callOrder = [];
    const upload = vi.fn(async () => {
      callOrder.push("upload");
      return { error: null };
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn(async () => {
      callOrder.push("insert");
      return { data: { id: "new-client-id" }, error: null };
    });
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        })),
        insert,
      })),
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };
    const service = createPortfolioAdminService(client);
    const logo = { name: "Logo.png", type: "image/png", size: 1024 };
    const draft = {
      ...createEmptyAdminDraft(),
      name: "New Client",
      year: "2026",
      discipline: "Design",
      logo,
    };

    await service.saveClient(draft);

    expect(callOrder).toEqual(["insert", "upload"]);
    expect(upload.mock.calls[0][0]).toMatch(/^new-client\/logo-.+-logo\.png$/);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 0 }));
  });

  it("persists a complete client order with one RPC request", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);

    await service.saveClientOrder(["third", "first", "second"]);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("admin_reorder_portfolio_clients", {
      p_client_ids: ["third", "first", "second"],
    });
  });

  it("blocks every Storage path outside the selected client prefix", () => {
    expect(() =>
      assertScopedPaths(
        ["maja/videos/one.mp4", "vectus/videos/other.mp4"],
        "maja",
      ),
    ).toThrow("fuera del cliente seleccionado");
  });

  it("deletes only the selected client's unique media paths and normalizes order atomically", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ remove })) },
      from: vi.fn(() => ({
        update: () => ({ eq: updateEq }),
      })),
      rpc,
    };
    const service = createPortfolioAdminService(client);

    await service.deleteClient({
      id: "maja-id",
      slug: "public-slug",
      storagePrefix: "maja",
      cover: null,
      projects: [
        { src: "maja/videos/one.mp4" },
        { src: "maja/videos/one.mp4" },
      ],
    });

    expect(remove).toHaveBeenCalledWith(["maja/videos/one.mp4"]);
    expect(updateEq).toHaveBeenCalledWith("id", "maja-id");
    expect(rpc).toHaveBeenCalledWith("admin_delete_portfolio_client", {
      p_client_id: "maja-id",
    });
  });

  it("surfaces an unauthorized About update without mutating the draft", async () => {
    const denied = new Error("new row violates row-level security policy");
    const single = vi.fn().mockResolvedValue({ data: null, error: denied });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const client = {
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
      from: vi.fn(() => ({ update })),
    };
    const service = createPortfolioAdminService(client);
    const draft = {
      graphicDesign: ["Diseño"],
      videoEditing: ["Video"],
      keySkills: ["Comunicación"],
      technicalSkills: ["Canva"],
      languages: ["Inglés C1 — Cambridge University"],
    };

    await expect(service.saveAboutContent(draft)).rejects.toThrow(
      "row-level security",
    );
    expect(update).toHaveBeenCalledWith({ content: draft });
    expect(eq).toHaveBeenCalledWith("content_key", "about");
    expect(draft).not.toHaveProperty("profile");
  });
});
