import { describe, expect, it, vi } from "vitest";
import {
  assertScopedPaths,
  createPortfolioAdminService,
} from "./portfolioAdminService";
import {
  clientToAdminDraft,
  createEmptyAdminDraft,
  createPendingEdition,
  createPendingEditionSection,
  createPendingItem,
  moveAdminMediaItem,
} from "./adminDraft";
import { mapPortfolioRowsToClients } from "../data/portfolioDatabase";

function incompatibleVideo() {
  const box = (type, payload = new Uint8Array()) => {
    const result = new Uint8Array(8 + payload.length);
    new DataView(result.buffer).setUint32(0, result.length);
    result.set([...type].map((character) => character.charCodeAt(0)), 4);
    result.set(payload, 8);
    return result;
  };
  const ftyp = box("ftyp", new TextEncoder().encode("isom0000isom"));
  const moov = box("moov", box("hvc1", new Uint8Array(32)));
  const mdat = box("mdat", new Uint8Array(8));
  const bytes = new Uint8Array([...ftyp, ...moov, ...mdat]);
  return new File([bytes], "hevc.mp4", { type: "video/mp4" });
}

function compatibleVideo() {
  const box = (type, payload = new Uint8Array()) => {
    const result = new Uint8Array(8 + payload.length);
    new DataView(result.buffer).setUint32(0, result.length);
    result.set([...type].map((character) => character.charCodeAt(0)), 4);
    result.set(payload, 8);
    return result;
  };
  const ftyp = box("ftyp", new TextEncoder().encode("isom0000isomavc1"));
  const moov = box("moov", box("avc1", new Uint8Array(32)));
  const mdat = box("mdat", new Uint8Array(8));
  return new File([new Uint8Array([...ftyp, ...moov, ...mdat])], "companion.mp4", {
    type: "video/mp4",
  });
}

function databaseUuid(value) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

function relationalMediaItem(editionNumber, sectionType, index) {
  const letter = String.fromCharCode(97 + index);
  const isStory = sectionType === "storySequence";
  const sectionOffset = isStory ? 100 : 0;
  return {
    id: databaseUuid(editionNumber * 1000 + sectionOffset + index + 1),
    media_kind: isStory ? "story" : "video",
    storage_path: `tardeo/edicion-${editionNumber}/${isStory ? "stories" : "posts"}/${letter}.${isStory ? "jpg" : "mp4"}`,
    mime_type: isStory ? "image/jpeg" : "video/mp4",
    alt_text: `${isStory ? "Story" : "Post"} ${letter.toUpperCase()}`,
    width: 1080,
    height: isStory ? 1920 : 1350,
    sort_order: index,
    audio_enabled: isStory ? null : index !== 1,
    config: { fixture: letter },
  };
}

function tardeoReorderDraft() {
  const [client] = mapPortfolioRowsToClients([{
    id: databaseUuid(9000),
    slug: "tardeo",
    storage_prefix: "tardeo",
    name: "Tardeo",
    year: "2026",
    disciplines: ["Eventos/Entretenimiento"],
    logo_path: "tardeo/logo.jpeg",
    sort_order: 2,
    published: true,
    config: {},
    portfolio_sections: [],
    portfolio_editions: [1, 2].map((editionNumber) => ({
      id: databaseUuid(editionNumber),
      edition_key: `edicion-${editionNumber}`,
      label: `Edicion ${editionNumber}`,
      sort_order: editionNumber - 1,
      coming_soon: editionNumber === 2,
      config: {},
      portfolio_sections: editionNumber === 1 ? [
        {
          id: databaseUuid(editionNumber * 10 + 1),
          section_type: "mediaRows",
          title: "Posts",
          sort_order: 0,
          config: {},
          portfolio_media_items: [],
          portfolio_media_groups: [{
            id: databaseUuid(editionNumber * 100 + 1),
            group_kind: "media_row",
            label: "Fila 1",
            sort_order: 0,
            config: {},
            portfolio_media_items: Array.from({ length: 3 }, (_, index) =>
              relationalMediaItem(editionNumber, "mediaRows", index),
            ),
          }],
        },
        {
          id: databaseUuid(editionNumber * 10 + 2),
          section_type: "storySequence",
          title: "Stories",
          sort_order: 1,
          config: {},
          portfolio_media_groups: [],
          portfolio_media_items: Array.from({ length: 3 }, (_, index) =>
            relationalMediaItem(editionNumber, "storySequence", index),
          ),
        },
      ] : [],
    })),
  }]);
  return clientToAdminDraft(client);
}

describe("admin destructive operations", () => {
  it("removes an existing logo only after the client was saved without its reference", async () => {
    const callOrder = [];
    const remove = vi.fn(async () => {
      callOrder.push("cleanup");
      return { error: null };
    });
    const rpc = vi.fn(async () => {
      callOrder.push("save");
      return { error: null };
    });
    const client = {
      storage: { from: vi.fn(() => ({ upload: vi.fn(), remove })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      discipline: "Design",
      existingLogoPath: "example/logo.jpg",
      logoRemoved: true,
    };

    await service.saveClient(draft);

    expect(rpc.mock.calls[0][1].p_payload.client.logo_path).toBeNull();
    expect(remove).toHaveBeenCalledWith(["example/logo.jpg"]);
    expect(callOrder).toEqual(["save", "cleanup"]);
  });

  it("does not clean up an existing logo when saving its removal fails", async () => {
    const remove = vi.fn();
    const client = {
      storage: { from: vi.fn(() => ({ upload: vi.fn(), remove })) },
      rpc: vi.fn().mockResolvedValue({ error: new Error("save failed") }),
    };
    const service = createPortfolioAdminService(client);
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      discipline: "Design",
      existingLogoPath: "example/logo.jpg",
      logoRemoved: true,
    };

    await expect(service.saveClient(draft)).rejects.toThrow("save failed");
    expect(remove).not.toHaveBeenCalled();
  });

  it("syncs only the changed persisted edition by its Database id", async () => {
    const upload = vi.fn();
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "festival",
      storagePrefix: "festival",
      name: "Festival",
      year: "2026",
      disciplines: ["Eventos"],
      cover: "festival/logo.jpg",
      content: [],
      editions: Array.from({ length: 3 }, (_, index) => ({
        id: `edicion-${index + 1}`,
        databaseId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        editionKey: `edicion-${index + 1}`,
        label: `Edición ${index + 1}`,
        sortOrder: index,
        content: [],
      })),
    });
    draft.editionDrafts[2].label = "Edición 3 actualizada";

    await service.saveClient(draft);

    expect(upload).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][0]).toBe("admin_sync_portfolio_client");
    expect(rpc.mock.calls[0][1].p_payload.editions).toEqual([
      expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000003",
        edition_key: "edicion-3",
      }),
    ]);
  });

  it.each([
    ["Posts", "mediaRows"],
    ["Stories", "storySequence"],
  ])(
    "reorders persisted Tardeo %s in Edition 1 without uploads, cleanup, or duplicated media",
    async (_label, sectionType) => {
      const upload = vi.fn();
      const remove = vi.fn().mockResolvedValue({ error: null });
      const rpc = vi.fn().mockResolvedValue({ error: null });
      const service = createPortfolioAdminService({
        storage: { from: vi.fn(() => ({ upload, remove })) },
        rpc,
      });
      const draft = tardeoReorderDraft();
      const editionOne = draft.editionDrafts[0];
      const editionTwoBefore = JSON.stringify(draft.editionDrafts[1]);
      const targetSection = editionOne.sections.find(
        (section) => section.type === sectionType,
      );
      const targetItems = sectionType === "mediaRows"
        ? targetSection.groups[0].items
        : targetSection.items;
      const originalItems = [...targetItems];
      const reorderedItems = moveAdminMediaItem(
        moveAdminMediaItem(originalItems, 2, -1),
        1,
        -1,
      );
      if (sectionType === "mediaRows") targetSection.groups[0].items = reorderedItems;
      else targetSection.items = reorderedItems;

      await service.saveClient(draft);

      expect(upload).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(rpc).toHaveBeenCalledOnce();
      expect(rpc.mock.calls[0][0]).toBe("admin_sync_portfolio_client");
      expect(rpc.mock.calls[0][1].p_client_id).toBe(databaseUuid(9000));
      expect(typeof rpc.mock.calls[0][1].p_payload).toBe("object");

      const payload = rpc.mock.calls[0][1].p_payload;
      expect(payload.editions).toHaveLength(1);
      expect(payload.editions[0].id).toBe(databaseUuid(1));
      expect(payload.editions.some((edition) => edition.id === databaseUuid(2))).toBe(
        false,
      );
      expect(JSON.stringify(draft.editionDrafts[1])).toBe(editionTwoBefore);

      const persistedSection = payload.editions[0].sections.find(
        (section) => section.section_type === sectionType,
      );
      const persistedItems = sectionType === "mediaRows"
        ? persistedSection.groups[0].items
        : persistedSection.items;
      const expectedOrder = [originalItems[2], originalItems[0], originalItems[1]];
      expect(persistedItems.map((item) => item.id)).toEqual(
        expectedOrder.map((item) => item.id),
      );
      expect(persistedItems.map((item) => item.storage_path)).toEqual(
        expectedOrder.map((item) => item.storagePath),
      );
      expect(persistedItems.map((item) => item.media_kind)).toEqual(
        expectedOrder.map((item) => item.type),
      );
      expect(persistedItems.map((item) => item.audio_enabled)).toEqual(
        expectedOrder.map((item) =>
          item.type === "video" ? item.audioEnabled !== false : null,
        ),
      );
      expect(new Set(persistedItems.map((item) => item.id)).size).toBe(3);
      expect([...persistedItems.map((item) => item.id)].sort()).toEqual(
        [...originalItems.map((item) => item.id)].sort(),
      );
      const uuidIds = payload.editions.flatMap((edition) => [
        edition.id,
        ...edition.sections.flatMap((section) => [
          section.id,
          ...section.groups.flatMap((group) => [
            group.id,
            ...group.items.map((item) => item.id),
          ]),
          ...section.items.map((item) => item.id),
        ]),
      ]).filter(Boolean);
      expect(uuidIds.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))).toBe(true);
      expect(uuidIds.every((id) => !id.includes("-row-"))).toBe(true);
      if (sectionType === "mediaRows") {
        expect(targetSection.groups[0]).toMatchObject({
          id: databaseUuid(101),
          existing: true,
        });
        expect(persistedSection.groups[0].id).toBe(databaseUuid(101));
      }
    },
  );

  it("does not upload or replace Database rows when an existing draft is unchanged", async () => {
    const upload = vi.fn();
    const remove = vi.fn();
    const rpc = vi.fn();
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "tardeo",
      storagePrefix: "tardeo",
      name: "Tardeo",
      year: "2026",
      discipline: "Eventos/Entretenimiento",
    };
    draft.originalDraftSignature = JSON.stringify(
      Object.fromEntries(
        Object.entries(draft).filter(([key]) => key !== "originalDraftSignature"),
      ),
    );

    await service.saveClient(draft);

    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks an incompatible video before any Storage upload", async () => {
    const upload = vi.fn();
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove: vi.fn() })) },
    };
    const service = createPortfolioAdminService(client);
    const file = incompatibleVideo();
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      discipline: "Design",
      videos: [
        {
          id: "new-video",
          existing: false,
          removed: false,
          file,
          name: file.name,
          type: "video",
          mimeType: file.type,
          width: 1080,
          height: 1920,
        },
      ],
    };

    await expect(service.saveClient(draft)).rejects.toThrow(
      "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
    );
    expect(upload).not.toHaveBeenCalled();
  });

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

  it("uploads a replacement story companion through the existing video pipeline", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const file = compatibleVideo();
    const draft = {
      ...createEmptyAdminDraft(),
      id: "rambla-id",
      slug: "rambla",
      storagePrefix: "rambla",
      name: "Rambla",
      year: "2026",
      discipline: "Eventos/Entretenimiento",
      stories: [
        {
          id: "story",
          existing: true,
          removed: false,
          storagePath: "rambla/stories/one.jpg",
          name: "one.jpg",
          type: "story",
        },
      ],
      sectionConfig: {
        storySequence: {
          presentation: "dualPhoneVideo",
          companionVideo: {
            id: "replacement",
            existing: false,
            removed: false,
            file,
            name: file.name,
            mimeType: file.type,
            type: "video",
            width: 1080,
            height: 1920,
            audioEnabled: true,
            replacedStoragePath: "rambla/stories/old-companion.mp4",
          },
        },
      },
    };

    await service.saveClient(draft);

    expect(upload.mock.calls[0][0]).toMatch(
      /^rambla\/stories\/companion\/.+-companion\.mp4$/,
    );
    expect(remove).toHaveBeenCalledWith(["rambla/stories/old-companion.mp4"]);
    const storySection = rpc.mock.calls[0][1].p_payload.sections.find(
      (section) => section.section_type === "storySequence",
    );
    expect(storySection.groups[0].items).toHaveLength(1);
    expect(storySection.groups[0].items[0].audio_enabled).toBe(true);
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

  it("persists a new client edition tree with each section under its edition", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({
      data: { id: "new-client-id" },
      error: null,
    });
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        })),
        insert,
      })),
      rpc,
    };
    const service = createPortfolioAdminService(client);
    const logo = new File(["logo"], "logo.png", { type: "image/png" });
    const postFile = new File(["post"], "post.jpg", { type: "image/jpeg" });
    const firstEdition = createPendingEdition([]);
    const secondEdition = createPendingEdition([firstEdition]);
    const postSection = createPendingEditionSection("postGrid");
    postSection.items.push(createPendingItem(postFile, "post"));
    secondEdition.sections.push(postSection);
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Festival",
      year: "2026",
      discipline: "Eventos",
      logo,
      usesEditions: true,
      editionDrafts: [firstEdition, secondEdition],
    };

    await service.saveClient(draft);

    expect(rpc.mock.calls[0][0]).toBe("admin_sync_portfolio_client");
    const payload = rpc.mock.calls[0][1].p_payload;
    expect(payload.sections).toEqual([]);
    expect(payload.editions.map((edition) => edition.edition_key)).toEqual([
      "edicion-1",
      "edicion-2",
    ]);
    expect(payload.editions[0].sections).toEqual([]);
    expect(payload.editions[1].sections[0]).toMatchObject({
      section_type: "postGrid",
      items: [expect.objectContaining({ storage_path: expect.stringContaining("/ediciones/edicion-2/posts/") })],
    });
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
