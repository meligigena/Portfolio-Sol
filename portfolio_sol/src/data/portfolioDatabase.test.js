import { describe, expect, it, vi } from "vitest";
import {
  fetchAdminPortfolioClients,
  mapPortfolioRowsToClients,
} from "./portfolioDatabase";

describe("portfolio database mapping", () => {
  it("uses sort_order as the only client ordering source and exposes it to Admin", () => {
    const rows = [
      { id: "third", slug: "aaa", name: "AAA", sort_order: 2 },
      { id: "first", slug: "zzz", name: "ZZZ", sort_order: 0, coming_soon: true },
      { id: "second", slug: "mmm", name: "MMM", sort_order: 1 },
    ].map((row) => ({
      year: "2026",
      disciplines: ["Design"],
      logo_path: `${row.slug}/logo.jpg`,
      published: true,
      config: {},
      portfolio_editions: [],
      portfolio_sections: [],
      ...row,
    }));

    const mapped = mapPortfolioRowsToClients(rows);

    expect(mapped.map((client) => client.id)).toEqual(["first", "second", "third"]);
    expect(mapped.map((client) => client.sortOrder)).toEqual([0, 1, 2]);
    expect(mapped[0].comingSoon).toBe(true);
  });

  it("derives coming soon from media instead of the stored compatibility flag", () => {
    const baseRow = {
      id: "example-id",
      slug: "example",
      name: "Example",
      year: "2026",
      disciplines: ["Design"],
      logo_path: "example/logo.jpg",
      sort_order: 0,
      published: true,
      config: {},
      portfolio_editions: [],
    };
    const postSection = {
      id: "posts",
      section_type: "postGrid",
      title: "Posts",
      sort_order: 0,
      config: {},
      portfolio_media_groups: [],
      portfolio_media_items: [
        {
          id: "post-1",
          media_kind: "post",
          storage_path: "example/posts/one.jpg",
          sort_order: 0,
          config: {},
        },
      ],
    };

    const [emptyClient, populatedClient] = mapPortfolioRowsToClients([
      { ...baseRow, id: "empty", slug: "empty", coming_soon: false, portfolio_sections: [] },
      {
        ...baseRow,
        id: "populated",
        slug: "populated",
        coming_soon: true,
        portfolio_sections: [postSection],
      },
    ]);

    expect(emptyClient.comingSoon).toBe(true);
    expect(populatedClient.comingSoon).toBeUndefined();
    expect(populatedClient.content).toHaveLength(1);
  });

  it("selects and propagates the canonical storage_prefix for admin clients", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "client-id",
          slug: "public-slug",
          storage_prefix: "canonical-prefix",
          name: "Example",
          year: "2026",
          disciplines: ["Design"],
          logo_path: "legacy-logo-folder/logo.jpg",
          sort_order: 0,
          published: true,
          config: {},
          portfolio_editions: [],
          portfolio_sections: [],
        },
      ],
      error: null,
    });
    const select = vi.fn(() => ({ order }));
    const client = { from: vi.fn(() => ({ select })) };

    const [portfolioClient] = await fetchAdminPortfolioClients(client);

    expect(select.mock.calls[0][0]).toContain("storage_prefix");
    expect(portfolioClient.storagePrefix).toBe("canonical-prefix");
  });

  it("maps relational rows to the reusable public content contract", () => {
    const clients = mapPortfolioRowsToClients([
      {
        slug: "example",
        name: "Example",
        year: "2026",
        disciplines: ["Diseño"],
        logo_path: "example/logo.jpg",
        sort_order: 10,
        published: true,
        config: {},
        portfolio_editions: [],
        portfolio_sections: [
          {
            id: "posts",
            section_type: "postGrid",
            title: "Posts",
            sort_order: 1,
            config: {},
            portfolio_media_groups: [],
            portfolio_media_items: [
              {
                id: "post-1",
                media_kind: "post",
                storage_path: "example/posts/one.jpg",
                alt_text: "Post one",
                width: 1080,
                height: 1350,
                sort_order: 0,
                config: { presentation: "raw" },
              },
            ],
          },
          {
            id: "carousels",
            section_type: "carouselPairs",
            title: "Carruseles",
            sort_order: 2,
            config: {},
            portfolio_media_items: [],
            portfolio_media_groups: [
              {
                id: "carousel-1",
                label: "Carrusel 1",
                group_kind: "carousel",
                sort_order: 0,
                config: {},
                portfolio_media_items: [
                  {
                    id: "slide-1",
                    media_kind: "carouselSlide",
                    storage_path: "example/carruseles/carrusel-1/one.jpg",
                    alt_text: "Slide one",
                    width: 1080,
                    height: 1350,
                    sort_order: 0,
                    config: {},
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(clients).toHaveLength(1);
    expect(clients[0].cover).toBe("example/logo.jpg");
    expect(clients[0].content.map((block) => block.type)).toEqual([
      "postGrid",
      "carouselPairs",
    ]);
    expect(clients[0].content[1].items[0].items[0].src).toBe(
      "example/carruseles/carrusel-1/one.jpg",
    );
  });

  it("preserves edition order and exceptional block configuration", () => {
    const [client] = mapPortfolioRowsToClients([
      {
        slug: "tardeo",
        name: "Tardeo",
        year: "2026",
        disciplines: ["Eventos/Entretenimiento"],
        logo_path: "tardeo/logo.jpeg",
        sort_order: 2,
        published: true,
        config: {},
        portfolio_sections: [],
        portfolio_editions: [
          {
            id: "edition-1",
            edition_key: "edicion-1",
            label: "Edición 1",
            sort_order: 0,
            coming_soon: false,
            config: {},
            portfolio_sections: [
              {
                id: "rows",
                section_type: "mediaRows",
                title: "Posts",
                sort_order: 0,
                config: {},
                portfolio_media_items: [],
                portfolio_media_groups: [
                  {
                    id: "row-1",
                    group_kind: "media_row",
                    label: "Fila 1",
                    sort_order: 0,
                    config: {},
                    portfolio_media_items: [
                      {
                        id: "video-1",
                        media_kind: "video",
                        storage_path: "tardeo/edicion-1/fila-1/video.mp4",
                        alt_text: "Video",
                        width: 1080,
                        height: 1920,
                        sort_order: 0,
                        audio_enabled: false,
                        config: { presentation: "strip" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "edition-2",
            edition_key: "edicion-2",
            label: "Edición 2",
            sort_order: 1,
            coming_soon: true,
            config: {},
            portfolio_sections: [],
          },
        ],
      },
    ]);

    expect(client.editions.map((edition) => edition.id)).toEqual([
      "edicion-1",
      "edicion-2",
    ]);
    expect(client.editions[0].content[0].type).toBe("mediaRows");
    expect(client.editions[1].comingSoon).toBe(true);
  });

  it("keeps custom section order and removes sections without valid media", () => {
    const [client] = mapPortfolioRowsToClients([
      {
        id: "rambla-id",
        slug: "rambla",
        name: "Rambla",
        year: "2026",
        disciplines: ["Eventos/Entretenimiento"],
        logo_path: "rambla/logo.jpg",
        sort_order: 0,
        published: true,
        config: {},
        portfolio_editions: [],
        portfolio_sections: [
          {
            id: "brand",
            section_type: "customMedia",
            title: "CreaciÃ³n de marca",
            sort_order: 0,
            config: { presentation: "responsiveBanner" },
            portfolio_media_groups: [],
            portfolio_media_items: [
              {
                id: "wide",
                media_kind: "image",
                storage_path: "rambla/banners/banner_horizontal.jpeg",
                alt_text: "Banner horizontal de Rambla",
                width: 1920,
                height: 700,
                sort_order: 0,
                config: { viewport: "desktop" },
              },
            ],
          },
          {
            id: "empty-posts",
            section_type: "postGrid",
            title: "Posts",
            sort_order: 1,
            config: {},
            portfolio_media_groups: [],
            portfolio_media_items: [],
          },
          {
            id: "empty-carousel",
            section_type: "carouselPairs",
            title: "Carruseles",
            sort_order: 2,
            config: {},
            portfolio_media_items: [],
            portfolio_media_groups: [
              {
                id: "empty-group",
                group_kind: "carousel",
                label: "VacÃ­o",
                sort_order: 0,
                config: {},
                portfolio_media_items: [],
              },
            ],
          },
        ],
      },
    ]);

    expect(client.content.map((block) => block.title)).toEqual([
      "CreaciÃ³n de marca",
    ]);
    expect(client.content[0].items[0].viewport).toBe("desktop");
  });

  it("maps a banners section and filters it when no responsive media exists", () => {
    const base = {
      slug: "rambla",
      name: "Rambla",
      year: "2026",
      disciplines: ["Eventos/Entretenimiento"],
      logo_path: "rambla/logo.jpg",
      sort_order: 0,
      published: true,
      config: {},
      portfolio_editions: [],
    };
    const bannerSection = {
      id: "brand",
      section_type: "banners",
      title: "Creación de marca",
      sort_order: 0,
      config: { presentation: "responsiveBanner" },
      portfolio_media_groups: [],
      portfolio_media_items: [
        {
          id: "desktop",
          media_kind: "banner",
          storage_path: "rambla/banners/banner_horizontal.jpeg",
          mime_type: "image/jpeg",
          sort_order: 0,
          config: { viewport: "desktop" },
        },
        {
          id: "mobile",
          media_kind: "banner",
          storage_path: "rambla/banners/banner_vertical.png",
          sort_order: 1,
          config: { viewport: "mobile" },
        },
      ],
    };

    const clients = mapPortfolioRowsToClients([
      { ...base, id: "populated", portfolio_sections: [bannerSection] },
      {
        ...base,
        id: "empty",
        slug: "empty",
        portfolio_sections: [
          { ...bannerSection, portfolio_media_items: [] },
        ],
      },
    ]);
    const populated = clients.find((client) => client.id === "populated");
    const empty = clients.find((client) => client.id === "empty");

    expect(populated.content[0].type).toBe("banners");
    expect(populated.content[0].items.map((item) => item.viewport)).toEqual([
      "desktop",
      "mobile",
    ]);
    expect(populated.content[0].items[0].mimeType).toBe("image/jpeg");
    expect(empty.content).toBeUndefined();
    expect(empty.comingSoon).toBe(true);
  });
});
