import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StorySequence } from "./StorySequence";

const story = {
  id: "story",
  type: "story",
  src: "example/stories/one.jpg",
  alt: "Story",
  width: 1080,
  height: 1920,
};

const videoStory = {
  id: "video-story",
  type: "video",
  src: "example/video-story/one.mp4",
  alt: "VideoStory",
  width: 1080,
  height: 1920,
  audioEnabled: false,
};

describe("StorySequence phone composition", () => {
  it("renders Stories only in one centered phone", () => {
    const { container } = render(<StorySequence projects={[story]} />);

    expect(container.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(container.querySelector("[data-story-image-device]")).toBeInTheDocument();
    expect(container.querySelector("[data-story-video-device]")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-story-presentation", "singlePhone");
  });

  it("renders VideoStory only in one centered phone", () => {
    const { container } = render(
      <StorySequence projects={[]} videoStory={videoStory} />,
    );

    expect(container.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(container.querySelector("[data-story-video-device]")).toBeInTheDocument();
    expect(container.querySelector("[data-story-image-device]")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-story-presentation", "singlePhone");
    expect(screen.getByLabelText("VideoStory")).toHaveAttribute(
      "src",
      expect.stringContaining("example/video-story/one.mp4"),
    );
  });

  it("renders VideoStory left and Stories right when both have media", () => {
    const { container } = render(
      <StorySequence projects={[story]} videoStory={videoStory} />,
    );
    const devices = [...container.querySelectorAll("[data-story-device]")];

    expect(devices).toHaveLength(2);
    expect(devices[0]).toHaveAttribute("data-story-video-device");
    expect(devices[1]).toHaveAttribute("data-story-image-device");
    expect(container.firstChild).toHaveAttribute("data-story-presentation", "dualPhone");
  });

  it.each([
    ["empty VideoStory", null, [story], "story"],
    ["empty Stories", videoStory, [], "video"],
  ])("ignores %s", (_label, nextVideoStory, projects, expectedKind) => {
    const { container } = render(
      <StorySequence projects={projects} videoStory={nextVideoStory} />,
    );

    expect(container.querySelectorAll("[data-story-device]")).toHaveLength(1);
    expect(container.querySelector("[data-story-device]")).toHaveAttribute(
      "data-media-kind",
      expectedKind,
    );
  });

  it("renders no phone block when both sections are empty", () => {
    const { container } = render(<StorySequence projects={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
