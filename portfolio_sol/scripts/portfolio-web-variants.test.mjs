import { describe, expect, it } from "vitest";
import { addVerifiedVariants, selectPublicImages } from "./portfolio-web-variants.mjs";

const snapshot = {
  portfolio_clients: [{ id: "client", slug: "future-client", storage_prefix: "images", published: true }],
  portfolio_editions: [{ id: "edition", coming_soon: false }],
  portfolio_sections: [{ id: "section", client_id: "client", section_type: "futureSection", edition_id: "edition" }],
  portfolio_media_groups: [{ id: "group", section_id: "section" }],
  portfolio_media_items: [
    { id: "direct", section_id: "section", storage_path: "images/source.jpg", mime_type: null },
    { id: "grouped", group_id: "group", storage_path: "images/source.webp", mime_type: "image/webp" },
    { id: "video", section_id: "section", storage_path: "images/movie.mp4", mime_type: "video/mp4" },
    { id: "svg", section_id: "section", storage_path: "images/logo.svg", mime_type: "image/svg+xml" },
  ],
};

describe("global image maintenance boundaries", () => {
  it("selects all public raster images irrespective of client, section or edition name", () => {
    expect(selectPublicImages(snapshot).map((item) => item.id)).toEqual(["direct", "grouped"]);
  });
  it("excludes unpublished clients and missing editions", () => {
    expect(selectPublicImages({ ...snapshot, portfolio_clients: [{ ...snapshot.portfolio_clients[0], published: false }] })).toEqual([]);
    expect(selectPublicImages({ ...snapshot, portfolio_editions: [] })).toEqual([]);
  });
  it("matches public rendering when populated clients/editions have stale coming-soon flags", () => {
    expect(selectPublicImages({ ...snapshot, portfolio_clients: [{ ...snapshot.portfolio_clients[0], coming_soon: true }],
      portfolio_editions: [{ id: "edition", coming_soon: true }] }).map((item) => item.id)).toEqual(["direct", "grouped"]);
  });
  it("rejects paths outside the client and traversal", () => {
    for (const storage_path of ["other/source.jpg", "images/../source.jpg", "images\\source.jpg"]) {
      expect(() => selectPublicImages({ ...snapshot, portfolio_media_items: [{ ...snapshot.portfolio_media_items[0], storage_path }] })).toThrow();
    }
  });
  it("changes only webVariants after verification and rejects duplicates", () => {
    const item = { storagePrefix: "images", storage_path: "images/source.jpg", config: { custom: { keep: true }, webVariants: [] } };
    const variant = { width: 720, height: 900, bytes: 100, path: "images/source-web-720.webp", verified: true };
    expect(addVerifiedVariants(item, [variant])).toEqual({ custom: { keep: true }, webVariants: [{ width: 720, path: variant.path }] });
    expect(item.config.webVariants).toEqual([]);
    for (const changes of [{ verified: false }, { bytes: 0 }, { path: item.storage_path }, { path: "other/source.webp" }]) {
      expect(() => addVerifiedVariants(item, [{ ...variant, ...changes }])).toThrow();
    }
    expect(() => addVerifiedVariants(item, [variant, variant])).toThrow();
  });
});
