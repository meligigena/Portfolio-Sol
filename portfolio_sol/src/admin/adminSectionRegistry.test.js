import { describe, expect, it } from "vitest";
import {
  ADMIN_SECTION_DEFINITIONS,
  getAvailableSectionDefinitions,
  getSectionDefinitionByType,
} from "./adminSectionRegistry";

describe("Admin section registry", () => {
  it("defines every supported section through one data-driven catalog", () => {
    expect(
      ADMIN_SECTION_DEFINITIONS.map(({ label, mediaKind, type, uploader }) => ({
        label,
        mediaKind,
        type,
        uploader,
      })),
    ).toEqual(
      expect.arrayContaining([
        { label: "Posts", mediaKind: "post", type: "postGrid", uploader: "direct" },
        { label: "Carruseles", mediaKind: "carouselSlide", type: "carouselPairs", uploader: "grouped" },
        { label: "Stories", mediaKind: "story", type: "storySequence", uploader: "direct" },
        { label: "Videos", mediaKind: "video", type: "videoStack", uploader: "direct" },
        { label: "Catálogos", mediaKind: "catalogPage", type: "catalogPair", uploader: "grouped" },
        { label: "Banners", mediaKind: "banner", type: "banners", uploader: "banners" },
      ]),
    );
  });

  it("offers only missing standard types and always leaves custom last", () => {
    const available = getAvailableSectionDefinitions({
      context: "root",
      presentTypes: ["postGrid", "storySequence"],
    });

    expect(available.map((definition) => definition.type)).toEqual([
      "carouselPairs",
      "videoStack",
      "catalogPair",
      "banners",
      "customMedia",
    ]);
    expect(available.at(-1).multiple).toBe(true);
  });

  it("calculates availability from the active edition only", () => {
    const firstEdition = getAvailableSectionDefinitions({
      context: "edition",
      presentTypes: ["postGrid"],
    });
    const secondEdition = getAvailableSectionDefinitions({
      context: "edition",
      presentTypes: ["videoStack"],
    });

    expect(firstEdition.map((definition) => definition.type)).not.toContain("postGrid");
    expect(secondEdition.map((definition) => definition.type)).toContain("postGrid");
  });

  it("defines the story companion as a single-item Admin media group", () => {
    expect(getSectionDefinitionByType("storySequence").companion).toMatchObject({
      groupKind: "story_companion",
      label: "Video Story",
      maxItems: 1,
      mediaKind: "video",
    });
  });
});
