import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicContentBlock } from "./PublicContentBlock";
import {
  STANDARD_SECTION_DEFINITIONS,
  getStandardSectionDefinitionByType,
} from "./sectionRegistry";

const media = (id, type, src, presentation = "raw") => ({
  id,
  type,
  src,
  alt: id,
  title: id,
  width: 1080,
  height: type === "story" || type === "video" ? 1920 : 1350,
  presentation,
  audioEnabled: false,
});

const fixtures = {
  storySequence: {
    type: "storySequence",
    title: "Stories",
    items: [media("story", "story", "client/stories/one.jpg", "phone")],
  },
  videoStory: {
    type: "videoStory",
    title: "VideoStory",
    items: [media("video-story", "video", "client/video-story/one.mp4", "phone")],
  },
  postGrid: {
    type: "postGrid",
    title: "Posts",
    items: [
      media("post-1", "post", "client/posts/one.jpg"),
      media("post-2", "post", "client/posts/two.jpg"),
    ],
  },
  carouselPairs: {
    type: "carouselPairs",
    title: "Carruseles",
    items: [{ id: "carousel", label: "Carousel", items: [media("slide", "carouselSlide", "client/carousels/one.jpg")] }],
  },
  videoStack: {
    type: "videoStack",
    title: "Videos",
    items: [media("video", "video", "client/videos/one.mp4", "reel")],
  },
  catalogPair: {
    type: "catalogPair",
    title: "Catálogos",
    items: [{ id: "catalog", label: "Catalog", pages: [media("page", "catalogPage", "client/catalogs/one.jpg")] }],
  },
};

describe("standard section registry", () => {
  it("defines the canonical data, editor, renderer, and motion contract once", () => {
    expect(
      STANDARD_SECTION_DEFINITIONS
        .filter(({ key }) => ["posts", "stories", "carousels", "videos", "catalogs", "videoStory"].includes(key))
        .map(({ dataModel, editor, public: publicContract, type }) => ({
          dataModel,
          groupKind: editor.groupKind,
          motion: publicContract.motion,
          renderer: publicContract.renderer,
          type,
        })),
    ).toEqual(expect.arrayContaining([
      { dataModel: "direct", groupKind: undefined, motion: "postPairs", renderer: "postGrid", type: "postGrid" },
      { dataModel: "direct", groupKind: undefined, motion: "storySequence", renderer: "storySequence", type: "storySequence" },
      { dataModel: "direct", groupKind: undefined, motion: "storySequence", renderer: "videoStory", type: "videoStory" },
      { dataModel: "grouped", groupKind: "carousel", motion: "carouselPairs", renderer: "carouselPairs", type: "carouselPairs" },
      { dataModel: "direct", groupKind: undefined, motion: "videoStack", renderer: "videoStack", type: "videoStack" },
      { dataModel: "grouped", groupKind: "catalog", motion: "catalogPair", renderer: "catalogPair", type: "catalogPair" },
    ]));
  });

  it.each(Object.entries(fixtures))(
    "renders a hydrated %s fixture through its registered public component and motion hook",
    (type, block) => {
      const { container } = render(<PublicContentBlock block={block} blockIndex={0} />);
      const section = container.querySelector("[data-section-renderer]");
      const definition = getStandardSectionDefinitionByType(type);

      expect(section).toHaveAttribute("data-section-renderer", definition.public.renderer);
      expect(section).toHaveAttribute("data-section-motion", definition.public.motion);
    },
  );

  it("uses the standard post-pair renderer for posts created inside an edition", () => {
    const { container } = render(
      <PublicContentBlock block={fixtures.postGrid} blockIndex={0} />,
    );

    expect(container.querySelectorAll("[data-post-pair]")).toHaveLength(1);
    expect(container.querySelectorAll('[data-media-kind="post"]')).toHaveLength(2);
  });
});
