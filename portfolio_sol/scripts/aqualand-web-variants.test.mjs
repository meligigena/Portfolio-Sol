import { describe, expect, it } from "vitest";
import { addVerifiedVariants, selectPilotItems } from "./aqualand-web-variants.mjs";

const story = { id: "story", media_kind: "story", storage_path: "aqualand/stories/source.jpg", mime_type: "image/jpeg", sort_order: 0 };
const client = { slug: "aqualand", storage_prefix: "aqualand", published: true, portfolio_sections: [
  { id: "stories", section_type: "storySequence", sort_order: 0, portfolio_media_items: [story, { ...story, media_kind: "video" }] },
  { id: "posts", section_type: "postGrid", sort_order: 1, portfolio_media_items: [story] },
  { id: "edition", edition_id: "excluded", section_type: "storySequence", sort_order: 2, portfolio_media_items: [story] },
] };

describe("Aqualand maintenance boundaries", () => {
  it("only selects published Aqualand stories and excludes video, posts and editions", () => {
    expect(selectPilotItems(client).map((item) => item.id)).toEqual(["story"]);
    expect(() => selectPilotItems({ ...client, slug: "rambla" })).toThrow();
    expect(() => selectPilotItems({ ...client, published: false })).toThrow();
    expect(() => selectPilotItems({ ...client, storage_prefix: "rambla" })).toThrow();
  });
  it("rejects paths outside the pilot or with traversal", () => {
    for (const storage_path of ["rambla/stories/source.jpg", "aqualand/stories/../source.jpg"]) {
      expect(() => selectPilotItems({ ...client, portfolio_sections: [{ ...client.portfolio_sections[0], portfolio_media_items: [{ ...story, storage_path }] }] })).toThrow();
    }
  });
  it("preserves all existing config and requires visual and download verification", () => {
    const item = { ...story, config: { presentation: "phone", poster_path: null, custom: { keep: true } } };
    const variant = { width: 720, height: 1280, bytes: 100, path: "aqualand/stories/source-web-720.webp", verified: true, visualPass: true };
    expect(addVerifiedVariants(item, [variant])).toEqual({ ...item.config, webVariants: [{ width: 720, path: variant.path }] });
    expect(item.config.webVariants).toBeUndefined();
    for (const changes of [{ verified: false }, { visualPass: false }, { bytes: 0 }, { path: item.storage_path }, { path: "rambla/source.webp" }]) {
      expect(() => addVerifiedVariants(item, [{ ...variant, ...changes }])).toThrow();
    }
  });
});
