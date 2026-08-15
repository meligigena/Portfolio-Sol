import { hasRenderableContentBlock } from "../data/projectContent";

export function combinePhoneSections(blocks = []) {
  const renderableBlocks = blocks.filter(hasRenderableContentBlock);
  const storiesIndex = renderableBlocks.findIndex(
    (block) => block.type === "storySequence",
  );
  const videoStoryIndex = renderableBlocks.findIndex(
    (block) => block.type === "videoStory",
  );

  if (storiesIndex < 0 || videoStoryIndex < 0) return renderableBlocks;

  const pairIndex = Math.min(storiesIndex, videoStoryIndex);
  const stories = renderableBlocks[storiesIndex];
  const videoStory = renderableBlocks[videoStoryIndex];

  return renderableBlocks.flatMap((block, index) => {
    if (index === pairIndex) {
      return [{
        id: `phone-stories:${videoStory.id ?? videoStoryIndex}:${stories.id ?? storiesIndex}`,
        type: "phoneStories",
        title: stories.title || "Stories",
        stories,
        videoStory,
      }];
    }
    if (index === storiesIndex || index === videoStoryIndex) return [];
    return [block];
  });
}
