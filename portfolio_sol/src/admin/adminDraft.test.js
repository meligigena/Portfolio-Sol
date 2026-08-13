import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildClientPayload,
  clientToAdminDraft,
  createEmptyAdminDraft,
  createPendingEdition,
  createPendingEditionSection,
  createPendingGroup,
  createPendingCustomSection,
  hasAdminDraftChanges,
  normalizeAdminText,
} from "./adminDraft";

function existingItem(id, type, storagePath, removed = false) {
  return {
    id,
    existing: true,
    removed,
    storagePath,
    name: storagePath.split("/").at(-1),
    type,
    alt: id,
    width: 1080,
    height: type === "story" ? 1920 : 1350,
    presentation: type === "story" ? "phone" : "raw",
    audioEnabled: true,
  };
}

describe("admin CRUD payloads", () => {
  it("does not hydrate persisted standard or custom sections without renderable media", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "example/logo.jpg",
      content: [
        { id: "empty-posts", type: "postGrid", title: "Posts", items: [] },
        {
          id: "posts",
          type: "postGrid",
          title: "Posts",
          items: [
            {
              id: "post",
              type: "post",
              src: "example/posts/one.jpg",
            },
          ],
        },
        {
          id: "empty-custom",
          type: "customMedia",
          title: "Packaging",
          items: [],
        },
      ],
      editions: [],
    });

    expect(draft.sectionOrder).toEqual(["posts"]);
    expect(draft.posts).toHaveLength(1);
    expect(draft.customSections).toEqual([]);
  });

  it("does not hydrate persisted empty sections inside editions", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "festival",
      storagePrefix: "festival",
      name: "Festival",
      year: "2026",
      disciplines: ["Eventos"],
      cover: "festival/logo.jpg",
      content: [],
      editions: [
        {
          id: "edicion-1",
          databaseId: "00000000-0000-4000-8000-000000000001",
          editionKey: "edicion-1",
          label: "Edición 1",
          sortOrder: 0,
          content: [
            { id: "empty-posts", type: "postGrid", title: "Posts", items: [] },
            {
              id: "stories",
              type: "storySequence",
              title: "Stories",
              items: [
                {
                  id: "story",
                  type: "story",
                  src: "festival/stories/one.jpg",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(draft.editionDrafts[0].sections.map((section) => section.type)).toEqual([
      "storySequence",
    ]);
  });

  it("keeps a newly added empty section in the draft but omits it from the payload", () => {
    const section = createPendingEditionSection("postGrid");
    const edition = createPendingEdition();
    edition.sections.push(section);
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Festival",
      year: "2026",
      discipline: "Eventos",
      existingLogoPath: "festival/logo.jpg",
      usesEditions: true,
      editionDrafts: [edition],
    };

    expect(edition.sections).toEqual([expect.objectContaining({ type: "postGrid" })]);
    expect(buildClientPayload(draft).editions[0].sections).toEqual([]);
  });

  it("omits a persisted standard section after its last file is removed", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "example/logo.jpg",
      content: [
        {
          id: "posts",
          type: "postGrid",
          title: "Posts",
          items: [
            { id: "post", type: "post", src: "example/posts/one.jpg" },
          ],
        },
      ],
      editions: [],
    });
    draft.posts[0].removed = true;

    expect(buildClientPayload(draft).sections).toEqual([]);
  });

  it("hydrates a nullable logo and serializes an explicit logo removal", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "example",
      storagePrefix: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "example/logo.jpg",
      content: [],
      editions: [],
    });

    expect(draft).toMatchObject({
      existingLogoPath: "example/logo.jpg",
      logo: null,
      logoRemoved: false,
    });
    expect(buildClientPayload({ ...draft, logoRemoved: true }).client.logo_path).toBeNull();
  });

  it("creates unlimited draft editions with safe identities and max-number sequencing", () => {
    const editions = [1, 2, 4, 5, 6].map((number, index) => ({
      id: `persisted-${number}`,
      persistedId: `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
      editionKey: `edicion-${number}`,
      label: `Edición ${number}`,
      number,
      sortOrder: index,
      sections: [],
    }));

    const next = createPendingEdition(editions);

    expect(next).toMatchObject({
      persistedId: null,
      editionKey: "edicion-7",
      label: "Edición 7",
      number: 7,
      sortOrder: 5,
      sections: [],
    });
    expect(next.tempId).toMatch(/^edition-/);
    expect(next.tempId).not.toBe(next.editionKey);
  });

  it("hydrates persisted edition ids and serializes only changed editions when requested", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "festival",
      storagePrefix: "festival",
      name: "Festival",
      year: "2026",
      disciplines: ["Eventos"],
      cover: "festival/logo.jpg",
      content: [],
      editions: Array.from({ length: 6 }, (_, index) => ({
        id: `edicion-${index + 1}`,
        databaseId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        editionKey: `edicion-${index + 1}`,
        label: `Edición ${index + 1}`,
        sortOrder: index,
        content: [],
      })),
    });

    expect(draft.usesEditions).toBe(true);
    expect(draft.editionDrafts).toHaveLength(6);
    expect(draft.editionDrafts[0].persistedId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );

    draft.editionDrafts[4].sections.push(createPendingEditionSection("postGrid"));
    const payload = buildClientPayload(draft, new Map(), { changedOnly: true });

    expect(payload.editions).toHaveLength(1);
    expect(payload.editions[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000005",
      edition_key: "edicion-5",
      sort_order: 4,
    });
  });

  it("keeps a normal new client edition-free by default", () => {
    const draft = createEmptyAdminDraft();

    expect(draft.usesEditions).toBe(false);
    expect(draft.editionDrafts).toEqual([]);
    expect(buildClientPayload(draft).editions).toEqual([]);
  });

  it("adds a new incremental RPC migration without deleting persisted editions", () => {
    const migration = readFileSync(
      "supabase/migrations/20260813150000_incremental_portfolio_editions.sql",
      "utf8",
    );

    expect(migration).toContain("admin_sync_portfolio_client");
    expect(migration).toContain("edition_payload ->> 'id'");
    expect(migration).toMatch(
      /where item\.id = \(item_payload ->> 'id'\)::uuid[\s\S]*and item\.section_id = target_section_id/i,
    );
    expect(migration).toMatch(
      /update public\.portfolio_media_items[\s\S]*sort_order = item_order[\s\S]*where id = target_item_id/i,
    );
    expect(migration).toContain("not (id = any(kept_item_ids))");
    expect(migration).not.toMatch(/delete from public\.portfolio_editions/i);
    expect(migration).not.toMatch(/disable row level security/i);
  });

  it("adds a new minimal migration that allows clients without a logo", () => {
    const migration = readFileSync(
      "supabase/migrations/20260813170000_nullable_portfolio_client_logo.sql",
      "utf8",
    );

    expect(migration).toMatch(/alter column logo_path drop not null/i);
    expect(migration).not.toMatch(/disable row level security/i);
    expect(migration).not.toMatch(/drop table/i);
  });

  it("uses storagePrefix instead of deriving it from logo_path", () => {
    const draft = clientToAdminDraft({
      id: "client-id",
      slug: "public-slug",
      storagePrefix: "canonical-prefix",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      cover: "legacy-logo-folder/logo.jpg",
      content: [],
      editions: [],
    });

    expect(draft.storagePrefix).toBe("canonical-prefix");
    expect(draft.storagePrefix).not.toBe("legacy-logo-folder");
  });

  it("versions the schema cleanup without weakening RLS", () => {
    const migration = readFileSync(
      "supabase/migrations/20260811120000_custom_sections_rambla_admin_cleanup.sql",
      "utf8",
    );

    expect(migration).toContain("'customMedia'");
    expect(migration).toContain("'image'");
    expect(migration).toContain("drop column summary");
    expect(migration).toContain("content - 'profile'");
    expect(migration).not.toMatch(/disable row level security/i);
  });

  it("creates a standard client with multiple independent carousels", () => {
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Nuevo Cliente",
      year: "2026",
      discipline: "Diseño",
      existingLogoPath: "nuevo-cliente/logo.jpg",
      carousels: [
        {
          ...createPendingGroup("carousel", 0),
          items: [
            existingItem(
              "slide-a",
              "carouselSlide",
              "nuevo-cliente/carruseles/carrusel-1/a.jpg",
            ),
          ],
        },
        {
          ...createPendingGroup("carousel", 1),
          items: [
            existingItem(
              "slide-b",
              "carouselSlide",
              "nuevo-cliente/carruseles/carrusel-2/b.jpg",
            ),
          ],
        },
      ],
    };

    const payload = buildClientPayload(draft);
    const carouselSection = payload.sections.find(
      (section) => section.section_type === "carouselPairs",
    );

    expect(payload.client.slug).toBe("nuevo-cliente");
    expect(carouselSection.groups).toHaveLength(2);
    expect(carouselSection.groups.map((group) => group.items.length)).toEqual([1, 1]);
  });

  it("keeps removals pending and excludes them only from the confirmed update", () => {
    const draft = {
      ...createEmptyAdminDraft(),
      id: "client-id",
      slug: "maja",
      name: "Maja",
      year: "2024",
      discipline: "Estética",
      existingLogoPath: "maja/logo.png",
      videos: [
        existingItem("keep", "video", "maja/videos/keep.mp4"),
        existingItem("remove", "video", "maja/videos/remove.mp4", true),
      ],
    };

    const payload = buildClientPayload(draft);
    const videos = payload.sections.find(
      (section) => section.section_type === "videoStack",
    );

    expect(draft.videos).toHaveLength(2);
    expect(videos.items.map((item) => item.storage_path)).toEqual([
      "maja/videos/keep.mp4",
    ]);
  });

  it("persists a custom section with multiple files in its explicit order", () => {
    const custom = {
      ...createPendingCustomSection(),
      title: "CreaciÃ³n de marca",
      items: [
        existingItem("wide", "image", "rambla/banners/banner_horizontal.jpeg"),
        existingItem("vertical", "image", "rambla/banners/banner_vertical.png"),
      ],
    };
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Rambla",
      year: "2026",
      discipline: "Eventos/Entretenimiento",
      existingLogoPath: "rambla/logo.jpg",
      stories: [existingItem("story", "story", "rambla/stories/one.jpg")],
      customSections: [custom],
      sectionOrder: [`custom:${custom.id}`, "stories", "posts", "carousels", "videos", "catalogs"],
    };

    const payload = buildClientPayload(draft);

    expect(payload.client).not.toHaveProperty("summary");
    expect(payload.sections.map((section) => section.title)).toEqual([
      "CreaciÃ³n de marca",
      "Stories",
    ]);
    expect(payload.sections[0].items).toHaveLength(2);
  });

  it("maps Banners as a standard section with explicit responsive variants", () => {
    const desktop = {
      ...existingItem(
        "wide",
        "banner",
        "rambla/banners/banner_horizontal.jpeg",
      ),
      viewport: "desktop",
      config: { viewport: "desktop" },
    };
    const mobile = {
      ...existingItem(
        "vertical",
        "banner",
        "rambla/banners/banner_vertical.png",
      ),
      viewport: "mobile",
      config: { viewport: "mobile" },
    };
    const draft = clientToAdminDraft({
      id: "rambla-id",
      slug: "rambla",
      storagePrefix: "rambla",
      name: "Rambla",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "rambla/logo.jpg",
      content: [
        {
          id: "brand",
          type: "banners",
          title: "Creación de marca",
          presentation: "responsiveBanner",
          config: { presentation: "responsiveBanner" },
          items: [desktop, mobile].map((item) => ({
            id: item.id,
            type: item.type,
            src: item.storagePath,
            viewport: item.viewport,
            config: item.config,
          })),
        },
      ],
      editions: [],
    });

    expect(draft.sectionOrder[0]).toBe("banners");
    expect(draft.bannerTitle).toBe("Creación de marca");
    expect(draft.banners.map((item) => item.viewport)).toEqual([
      "desktop",
      "mobile",
    ]);

    const payload = buildClientPayload(draft);
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0]).toMatchObject({
      section_type: "banners",
      title: "Creación de marca",
      config: { presentation: "responsiveBanner" },
    });
    expect(payload.sections[0].items.map((item) => item.media_kind)).toEqual([
      "banner",
      "banner",
    ]);
    expect(payload.sections[0].items.map((item) => item.config.viewport)).toEqual([
      "desktop",
      "mobile",
    ]);
  });

  it("drops a custom section when its last active item is removed", () => {
    const custom = {
      ...createPendingCustomSection(),
      title: "Packaging",
      items: [existingItem("removed", "image", "example/packaging/one.jpg", true)],
    };
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Example",
      year: "2026",
      discipline: "DiseÃ±o",
      existingLogoPath: "example/logo.jpg",
      customSections: [custom],
      sectionOrder: [`custom:${custom.id}`, ...createEmptyAdminDraft().sectionOrder],
    };

    const payload = buildClientPayload(draft);

    expect(payload.sections).toEqual([]);
    expect(payload.client.coming_soon).toBe(true);
  });

  it("derives coming_soon from the content saved by Admin", () => {
    const emptyDraft = {
      ...createEmptyAdminDraft(),
      name: "Example",
      year: "2026",
      discipline: "Diseño",
      existingLogoPath: "example/logo.jpg",
    };
    const withPost = {
      ...emptyDraft,
      comingSoon: true,
      posts: [existingItem("post", "post", "example/posts/one.jpg")],
    };

    expect(buildClientPayload(emptyDraft).client.coming_soon).toBe(true);
    expect(buildClientPayload(withPost).client.coming_soon).toBe(false);
  });

  it("hydrates and serializes Tardeo edition media without duplicating it", () => {
    const draft = clientToAdminDraft({
      id: "tardeo-id",
      slug: "tardeo",
      storagePrefix: "tardeo",
      name: "Tardeo",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "tardeo/logo.jpeg",
      content: [],
      editions: [
        {
          id: "edicion-1",
          label: "Edición 1",
          content: [
            {
              id: "posts",
              type: "mediaRows",
              title: "Posts",
              rows: [
                [
                  {
                    id: "row-1-video",
                    type: "video",
                    src: "tardeo/edicion 1/fila 1/one.mp4",
                    audioEnabled: false,
                  },
                ],
                [
                  {
                    id: "row-2-video",
                    type: "video",
                    src: "tardeo/edicion 1/fila 2/two.mp4",
                    audioEnabled: true,
                  },
                ],
              ],
            },
            {
              id: "stories",
              type: "storySequence",
              title: "Stories",
              items: [
                {
                  id: "story-1",
                  type: "story",
                  src: "tardeo/edicion 1/stories/one.jpg",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(draft.editionDrafts[0].sections[0].groups).toHaveLength(2);
    expect(draft.editionDrafts[0].sections[0].groups[0].items[0].storagePath).toBe(
      "tardeo/edicion 1/fila 1/one.mp4",
    );
    expect(draft.editionDrafts[0].sections[1].items[0].storagePath).toBe(
      "tardeo/edicion 1/stories/one.jpg",
    );
    expect(hasAdminDraftChanges(draft)).toBe(false);

    const [edition] = buildClientPayload(draft).editions;
    expect(edition.sections[0].groups.map((group) => group.items.length)).toEqual([
      1,
      1,
    ]);
    expect(edition.sections[1].items).toHaveLength(1);
    expect(
      edition.sections.flatMap((section) => [
        ...(section.items ?? []),
        ...(section.groups ?? []).flatMap((group) => group.items),
      ]),
    ).toHaveLength(3);
  });

  it("keeps persisted media-row UUIDs separate from local identities", () => {
    const sectionId = "d860bf89-2c54-4c37-b82e-e3ebfbd3156b";
    const groupId = "752f601e-9d91-4c15-83dd-49be4a8ab1af";
    const draft = clientToAdminDraft({
      id: "cbd1969e-ca34-4b87-b0a6-372376e729bc",
      slug: "tardeo",
      storagePrefix: "tardeo",
      name: "Tardeo",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "tardeo/logo.jpeg",
      content: [],
      editions: [{
        id: "edicion-1",
        databaseId: "aef84f7f-8649-419b-bb89-2f19d109a74d",
        editionKey: "edicion-1",
        label: "Edición 1",
        sortOrder: 0,
        content: [{
          id: sectionId,
          type: "mediaRows",
          title: "Posts",
          rows: [[{
            id: "0b49025f-a32d-46d8-8784-55860d7bd126",
            type: "video",
            src: "tardeo/edicion 1/fila 1/one.mp4",
          }]],
          rowGroups: [{ id: groupId, label: "Fila 1", config: {} }],
        }],
      }],
    });

    expect(draft.editionDrafts[0].sections[0].groups[0]).toMatchObject({
      id: groupId,
      tempId: null,
      existing: true,
    });
    expect(buildClientPayload(draft).editions[0].sections[0].groups[0].id).toBe(
      groupId,
    );
  });

  it("uses a tempId for a new media row and never serializes it as a UUID", () => {
    const section = createPendingEditionSection("mediaRows");
    const group = createPendingGroup("row", 0);
    group.items.push(existingItem(
      "0b49025f-a32d-46d8-8784-55860d7bd126",
      "video",
      "tardeo/edicion 1/fila 1/one.mp4",
    ));
    section.groups.push({ ...group, kind: "media_row" });
    const edition = createPendingEdition();
    edition.sections.push(section);
    const draft = {
      ...createEmptyAdminDraft(),
      name: "Tardeo",
      year: "2026",
      discipline: "Eventos/Entretenimiento",
      existingLogoPath: "tardeo/logo.jpeg",
      usesEditions: true,
      editionDrafts: [edition],
    };

    expect(group.id).toBeNull();
    expect(group.tempId).toMatch(/^row-/);
    const serializedGroup = buildClientPayload(draft).editions[0].sections[0].groups[0];
    expect(serializedGroup.id).toBeUndefined();
    expect(serializedGroup).not.toHaveProperty("tempId");
  });

  it("hydrates and persists the Rambla story companion audio setting", () => {
    const draft = clientToAdminDraft({
      id: "rambla-id",
      slug: "rambla",
      storagePrefix: "rambla",
      name: "Rambla",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      cover: "rambla/logo.jpg",
      content: [
        {
          id: "stories",
          type: "storySequence",
          title: "Stories",
          presentation: "dualPhoneVideo",
          items: [
            { id: "story", type: "story", src: "rambla/stories/one.jpg" },
          ],
          companionVideo: {
            id: "companion",
            type: "video",
            src: "rambla/stories/companion.mp4",
            audioEnabled: false,
          },
        },
      ],
      editions: [],
    });

    expect(draft.sectionConfig.storySequence.companionVideo).toMatchObject({
      existing: true,
      storagePath: "rambla/stories/companion.mp4",
      audioEnabled: false,
    });

    draft.sectionConfig.storySequence.companionVideo.audioEnabled = true;
    const storySection = buildClientPayload(draft).sections.find(
      (section) => section.section_type === "storySequence",
    );
    expect(storySection.groups[0]).toMatchObject({
      group_kind: "story_companion",
      items: [expect.objectContaining({ audio_enabled: true })],
    });
    expect(storySection.groups[0].items).toHaveLength(1);
  });

  it("repairs known UTF-8 mojibake without changing correct Spanish text", () => {
    expect(normalizeAdminText("CreaciÃ³n de marca")).toBe("Creación de marca");
    expect(normalizeAdminText("Nombre de la secciÃƒÂ³n")).toBe(
      "Nombre de la sección",
    );
    expect(normalizeAdminText("Edición de video")).toBe("Edición de video");
  });

  it("keeps active Admin source strings free of mojibake markers", () => {
    const activeSources = [
      "src/admin/adminDraft.js",
      "src/admin/adminValidation.js",
      "src/admin/AdminPage.jsx",
      "src/admin/AboutEditor.jsx",
      "src/admin/ClientEditor.jsx",
      "src/admin/ClientOrderEditor.jsx",
      "src/admin/FileDropzone.jsx",
      "src/admin/portfolioAdminService.js",
    ].map((path) => readFileSync(path, "utf8"));

    activeSources.forEach((source) => expect(source).not.toMatch(/[ÃÂâ]/));
  });
});
