import { describe, expect, it } from "vitest";
import { getClientBySlug } from "./clients";
import {
  hasRenderableContentBlock,
  hasRenderableProjectContent,
} from "./projectContent";

const media = (type, src) => ({ id: `${type}-1`, type, src });
const block = (type, items) => ({ type, title: type, items });

describe("renderable project content", () => {
  it("treats a client with zero content as coming soon", () => {
    expect(hasRenderableProjectContent({ content: [], projects: [] })).toBe(false);
  });

  it("does not count a logo or cover as project content", () => {
    expect(
      hasRenderableProjectContent({
        cover: "example/logo.jpg",
        logo_path: "example/logo.jpg",
      }),
    ).toBe(false);
  });

  it.each([
    ["post", block("postGrid", [media("post", "example/posts/one.jpg")])],
    ["story", block("storySequence", [media("story", "example/stories/one.jpg")])],
  ])("counts one %s as renderable content", (_label, contentBlock) => {
    expect(hasRenderableProjectContent({ content: [contentBlock] })).toBe(true);
  });

  it("counts a custom section only when it has renderable media", () => {
    const populated = block("customMedia", [
      media("image", "example/custom/identity.jpg"),
    ]);
    const empty = block("customMedia", [{ id: "empty", type: "image", src: "" }]);

    expect(hasRenderableContentBlock(populated)).toBe(true);
    expect(hasRenderableProjectContent({ content: [populated] })).toBe(true);
    expect(hasRenderableContentBlock(empty)).toBe(false);
    expect(hasRenderableProjectContent({ content: [empty] })).toBe(false);
  });

  it("returns to coming soon after the last content item is removed", () => {
    const client = {
      content: [block("postGrid", [media("post", "example/posts/one.jpg")])],
    };

    expect(hasRenderableProjectContent(client)).toBe(true);
    client.content[0].items = [];
    expect(hasRenderableProjectContent(client)).toBe(false);
  });

  it("derives El Tori from its content without a client-name exception", () => {
    const elTori = getClientBySlug("el-tori");

    expect(elTori).not.toHaveProperty("comingSoon");
    expect(hasRenderableProjectContent(elTori)).toBe(false);
  });
});
