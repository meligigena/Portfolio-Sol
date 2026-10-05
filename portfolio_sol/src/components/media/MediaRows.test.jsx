import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaRows } from "./MediaRows";

const rows = [0, 1].map((row) => Array.from({ length: 5 }, (_, index) => ({
  id: `row-${row}-${index}`,
  src: `example/row-${row}/${index}.mp4`,
  alt: `Video ${row}-${index}`,
  width: 1080,
  height: 1920,
  audioEnabled: true,
})));

function setup() {
  const observers = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {}
    disconnect = vi.fn();
  });
  const view = render(<MediaRows rows={rows} />);
  const videos = [...view.container.querySelectorAll("video")];
  const near = () => observers.find((observer) => observer.options?.rootMargin);
  const approach = (targets = [videos[0], videos[1], videos[2], videos[5]]) => act(() => {
    near().callback(targets.map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 })));
  });
  return { ...view, videos, observers, approach, near };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MediaRows video preparation", () => {
  it("prepares already visible videos without waiting for the first observer notification", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 600, bottom: 900, left: 16, right: 374, width: 358, height: 300,
    });
    const { videos } = setup();
    expect(videos[0]).toHaveAttribute("preload", "auto");
    expect(videos[1]).toHaveAttribute("preload", "auto");
    expect(videos.slice(2).every((video) => video.preload === "none")).toBe(true);
  });
  it("starts at most two nearby videos and leaves distant videos unloaded", () => {
    const { videos, approach, near } = setup();
    expect(videos.every((video) => video.preload === "none")).toBe(true);
    expect(near()).toBeDefined();
    approach();
    expect(videos.map((video) => video.preload)).toEqual([
      "auto", "auto", "none", "none", "none", "none", "none", "none", "none", "none",
    ]);
  });

  it("does not give a barely exposed horizontal cell priority over the next row", () => {
    const { videos, near } = setup();
    act(() => near().callback([
      { target: videos[0], isIntersecting: true, intersectionRatio: 1 },
      { target: videos[1], isIntersecting: true, intersectionRatio: 1 },
      { target: videos[2], isIntersecting: true, intersectionRatio: 0.02 },
      { target: videos[5], isIntersecting: true, intersectionRatio: 1 },
    ]));
    Object.defineProperty(videos[0], "readyState", { configurable: true, value: 3 });
    fireEvent.canPlay(videos[0]);
    expect(videos[2]).toHaveAttribute("preload", "none");
    expect(videos[5]).toHaveAttribute("preload", "auto");
  });

  it("gives the next pending video a slot after the first has a playable buffer", () => {
    const { videos, approach } = setup();
    approach();
    Object.defineProperty(videos[0], "readyState", { configurable: true, value: 3 });
    fireEvent.canPlay(videos[0]);
    expect(videos[0]).toHaveAttribute("preload", "metadata");
    expect(videos[1]).toHaveAttribute("preload", "auto");
    expect(videos[2]).toHaveAttribute("preload", "auto");
    expect(videos[5]).toHaveAttribute("preload", "none");
  });

  it("warms a hidden next video without playing or unmuting it", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const { videos, approach, observers } = setup();
    approach([videos[0], videos[1]]);
    const visibility = observers.find((observer) => !observer.options?.rootMargin);
    act(() => visibility.callback([{ target: videos[0], isIntersecting: true, intersectionRatio: 1 }]));
    expect(play.mock.instances).toContain(videos[0]);
    expect(play.mock.instances).not.toContain(videos[1]);
    expect(videos[1].muted).toBe(true);
  });

  it("keeps the same DOM node and source on an equivalent data rerender", () => {
    const { videos, rerender, container, approach } = setup();
    approach();
    const source = videos[0].querySelector("source").src;
    const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    rerender(<MediaRows rows={rows.map((row) => row.map((item) => ({ ...item })))} />);
    expect(container.querySelector("video")).toBe(videos[0]);
    expect(videos[0].querySelector("source").src).toBe(source);
    expect(videos[0]).toHaveAttribute("preload", "auto");
    expect(load).not.toHaveBeenCalled();
  });

  it("cleans up old edition priorities and SPA observers", () => {
    const { videos, rerender, container, approach, near, unmount } = setup();
    approach();
    const oldObserver = near();
    rerender(<MediaRows rows={[[{ ...rows[0][0], id: "edition-2", src: "example/edition-2.mp4" }]]} />);
    expect(videos.every((video) => video.preload === "none")).toBe(true);
    expect(oldObserver.disconnect).toHaveBeenCalled();
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video source").src).toContain("edition-2.mp4");
    unmount();
    expect(oldObserver.disconnect).toHaveBeenCalled();
  });
});
