import { useRef } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVideoWarmPreload } from "./useVideoWarmPreload";

function Sequence({ activeIndex = 0, onPrepared = () => {}, enabled = true }) {
  const containerRef = useRef(null);
  useVideoWarmPreload({ containerRef, mediaKey: "persisted-videos", activeIndex, onPrepared, enabled });
  return <div ref={containerRef}>{[0, 1, 2, 3].map((id) => (
    <video key={id} preload="none" muted><source src={`/videos/${id}.mp4`} /></video>
  ))}</div>;
}

function observe() {
  const observers = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {}
    disconnect = vi.fn();
  });
  return observers;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.fonts;
});

describe("useVideoWarmPreload sequence", () => {
  it("prepares active plus next, advances priorities, and preserves the source nodes", () => {
    const observers = observe();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    const { container, rerender } = render(<Sequence />);
    const videos = [...container.querySelectorAll("video")];
    act(() => observers[0].callback([{ target: container.firstChild, isIntersecting: true }]));
    expect(videos.map((v) => v.preload)).toEqual(["auto", "none", "none", "none"]);
    Object.defineProperty(videos[0], "readyState", { configurable: true, value: 3 });
    fireEvent.canPlay(videos[0]);
    expect(videos.map((v) => v.preload)).toEqual(["auto", "auto", "none", "none"]);
    Object.defineProperty(videos[1], "readyState", { configurable: true, value: 3 });
    fireEvent.canPlay(videos[1]);
    expect(videos[1]).toHaveAttribute("preload", "metadata");
    rerender(<Sequence activeIndex={1} />);
    expect(videos.map((v) => v.preload)).toEqual(["none", "auto", "auto", "none"]);
    expect(container.querySelectorAll("video")[1]).toBe(videos[1]);
    expect(videos[1].querySelector("source").src).toContain("/videos/1.mp4");
    expect(play).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(videos.every((v) => v.muted)).toBe(true);
    act(() => observers[0].callback([{ target: container.firstChild, isIntersecting: false }]));
    expect(videos.every((v) => v.preload === "none")).toBe(true);
  });

  it("does not prepare unresolved data", () => {
    const observers = observe();
    const { container } = render(<Sequence enabled={false} />);
    expect(observers).toHaveLength(0);
    expect([...container.querySelectorAll("video")].every((v) => v.preload === "none")).toBe(true);
  });

  it("waits for critical fonts and ignores their completion after SPA cleanup", async () => {
    let finishFonts;
    Object.defineProperty(document, "fonts", { configurable: true, value: {
      status: "loading", ready: new Promise((resolve) => { finishFonts = resolve; }),
    } });
    const observers = observe();
    const prepared = vi.fn();
    const { container, unmount } = render(<Sequence onPrepared={prepared} />);
    const videos = [...container.querySelectorAll("video")];
    act(() => observers[0].callback([{ target: container.firstChild, isIntersecting: true }]));
    expect(videos.every((v) => v.preload === "none")).toBe(true);
    unmount();
    await act(async () => finishFonts());
    expect(videos.every((v) => v.preload === "none")).toBe(true);
    expect(prepared).not.toHaveBeenCalled();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
