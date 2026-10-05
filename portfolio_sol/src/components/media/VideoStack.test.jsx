import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoStack } from "./VideoStack";

const items = Array.from({ length: 3 }, (_, index) => ({
  id: `video-${index}`,
  src: `example/videos/${index}.mp4`,
  alt: `Video ${index}`,
  width: 1080,
  height: 1920,
  audioEnabled: false,
}));

afterEach(() => vi.unstubAllGlobals());

describe("VideoStack loading", () => {
  it("does not request a distant stack and warms only the active and next video when near", () => {
    const observers = [];
    class MockIntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        observers.push(this);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const { container } = render(<VideoStack items={items} />);
    const videos = [...container.querySelectorAll("video")];

    expect(videos.map((video) => video.preload)).toEqual(["none", "none", "none"]);
    expect(play).not.toHaveBeenCalled();

    const nearObserver = observers.find((observer) => observer.options?.rootMargin);
    expect(nearObserver).toBeDefined();
    act(() => nearObserver.callback([{ target: container.firstChild, isIntersecting: true, intersectionRatio: 1 }]));

    expect(screen.getByLabelText("Video 0")).toHaveAttribute("preload", "auto");
    expect(screen.getByLabelText("Video 1")).toHaveAttribute("preload", "none");
    Object.defineProperty(videos[0], "readyState", { configurable: true, value: 3 });
    fireEvent.canPlay(videos[0]);
    expect(screen.getByLabelText("Video 1")).toHaveAttribute("preload", "auto");
    expect(screen.getByLabelText("Video 2")).toHaveAttribute("preload", "none");
  });
});
