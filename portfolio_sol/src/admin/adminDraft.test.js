import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildClientPayload,
  clientToAdminDraft,
  createEmptyAdminDraft,
  createPendingGroup,
  createPendingCustomSection,
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
});
