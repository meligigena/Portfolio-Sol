import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => vi.unstubAllGlobals());

describe("StorySequence phone composition", () => {
  it("warms the mounted VideoStory before viewport entry without restarting its source", () => {
    const observers = [];
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
      observe() {}
      disconnect() {}
    });
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const { container, rerender } = render(<StorySequence videoStory={videoStory} />);
    const video = container.querySelector("video");
    const src = video.src;
    const near = observers.find((observer) => observer.options?.rootMargin);
    act(() => near.callback([{ target: container.firstChild, isIntersecting: true }]));
    expect(video).toHaveAttribute("preload", "auto");
    expect(play).not.toHaveBeenCalled();
    rerender(<StorySequence videoStory={{ ...videoStory }} />);
    expect(container.querySelector("video")).toBe(video);
    expect(video.src).toBe(src);
    expect(video).toHaveAttribute("preload", "auto");
  });
  it("assigns URLs only to the first two story slides before scrolling", () => {
    const projects = Array.from({ length: 5 }, (_, index) => ({
      ...story,
      id: `story-${index}`,
      src: `example/stories/${index}.jpg`,
    }));
    const { container } = render(<StorySequence projects={projects} />);
    const images = [...container.querySelectorAll("[data-story-slide] img")];

    expect(images).toHaveLength(5);
    expect(images[0]).toHaveAttribute("src", expect.stringContaining("/0.jpg"));
    expect(images[1]).toHaveAttribute("src", expect.stringContaining("/1.jpg"));
    expect(images.slice(2).every((image) => !image.hasAttribute("src"))).toBe(true);
  });

  it("prioritizes only the first story when it is the first media section", () => {
    const { container } = render(
      <StorySequence projects={[story, { ...story, id: "second", src: "example/stories/two.jpg" }]} priority />,
    );
    const images = [...container.querySelectorAll("[data-story-slide] img")];

    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

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
