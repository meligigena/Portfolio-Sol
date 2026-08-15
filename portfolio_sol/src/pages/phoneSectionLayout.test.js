import { describe, expect, it } from "vitest";
import { combinePhoneSections } from "./phoneSectionLayout";

const block = (id, type, items = [{ id: `${id}-item`, src: `${id}.jpg` }]) => ({
  id,
  type,
  title: id,
  items,
});

describe("phone section layout", () => {
  it("uses the lower section order as the combined block position", () => {
    const result = combinePhoneSections([
      block("posts", "postGrid"),
      block("stories", "storySequence"),
      block("videos", "videoStack"),
      block("video-story", "videoStory", [
        { id: "video", src: "video.mp4", type: "video" },
      ]),
    ]);

    expect(result.map((entry) => entry.type)).toEqual([
      "postGrid",
      "phoneStories",
      "videoStack",
    ]);
    expect(result[1]).toMatchObject({
      stories: { id: "stories" },
      videoStory: { id: "video-story" },
    });
  });

  it("pairs sections independently for each content context", () => {
    const editionOne = combinePhoneSections([
      block("edition-1-video", "videoStory", [{ id: "v1", src: "v1.mp4" }]),
      block("edition-1-stories", "storySequence"),
    ]);
    const editionTwo = combinePhoneSections([block("edition-2-stories", "storySequence")]);

    expect(editionOne).toHaveLength(1);
    expect(editionOne[0].type).toBe("phoneStories");
    expect(editionTwo).toHaveLength(1);
    expect(editionTwo[0].type).toBe("storySequence");
  });
});
