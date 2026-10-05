import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { warmImageProps } from "../../lib/imageWarmPreload";
import { useImageWarmPreload } from "./useImageWarmPreload";

const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
const sizes = "(max-width: 48rem) 86vw, 342px";
const items = Array.from({ length: 40 }, (_, index) => ({
  id: `image-${index}`, src: `example/${index}.jpg`, width: 2000,
  config: { webVariants: [{ width: 720, path: `example/${index}-720.webp` }, { width: 1600, path: `example/${index}-1600.webp` }] },
}));
let observers;
let decode;

function Harness({ index = 0, edition = "one", enabled = true }) {
  const containerRef = useRef(null);
  useImageWarmPreload({ containerRef, activeIndex: index, ahead: 2, mediaKey: edition, enabled });
  return <div ref={containerRef}><div>{items.map((item, position) =>
    <div key={item.id}><img {...warmImageProps({ ...item, src: `${edition}/${item.src}`, config: undefined }, sizes, position)} alt="" loading="lazy" /></div>,
  )}</div></div>;
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.disconnect = vi.fn(); this.observe = vi.fn(); observers.push(this); }
  });
  decode = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
});
afterEach(() => {
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else delete HTMLImageElement.prototype.decode;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const enter = async (container) => act(async () => observers.at(-1).callback([{ target: container.firstChild, isIntersecting: true }]));

describe("useImageWarmPreload", () => {
  it("keeps global lazy loading until the section is near, then decodes current + next", async () => {
    const { container } = render(<Harness />);
    const images = [...container.querySelectorAll("img")];
    expect(decode).not.toHaveBeenCalled();
    expect(images.every(image => image.getAttribute("loading") === "lazy")).toBe(true);
    await enter(container);
    expect(images[0]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[1]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[0].fetchPriority).toBe("high");
    expect(images[1].fetchPriority).toBe("high");
    expect(images[4]).not.toHaveAttribute("src");
  });

  it("starts next + 1 progressively after current decodes while next keeps high priority", async () => {
    const resolve = [];
    decode.mockImplementation(() => new Promise(r => resolve.push(r)));
    const { container } = render(<Harness />);
    const images = [...container.querySelectorAll("img")];
    await enter(container);
    expect(decode).toHaveBeenCalledTimes(2);
    expect(images[2]).not.toHaveAttribute("src");
    await act(async () => resolve[0]());
    expect(images[2]).toHaveAttribute("src", expect.stringContaining("/2.jpg"));
    expect(images[2].fetchPriority).toBe("auto");
    expect(images[1].fetchPriority).toBe("high");
    expect(images[1]).toHaveAttribute("data-image-warm-state", "preparing");
  });

  it("moves a bounded window, keeps the previous resource and releases distant priorities", async () => {
    const { container, rerender } = render(<Harness />);
    await enter(container);
    const images = [...container.querySelectorAll("img")];
    const previousSrc = images[2].src;
    rerender(<Harness index={3} />);
    await act(async () => {});
    expect(images[2].src).toBe(previousSrc);
    expect(images[3]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[4]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[5].fetchPriority).toBe("auto");
    expect(images[0].loading).toBe("lazy");
    expect(images[0]).not.toHaveAttribute("data-image-warm-state");
    expect(images[6]).not.toHaveAttribute("src");
    for (let index = 4; index < 38; index += 1) { rerender(<Harness index={index} />); await act(async () => {}); }
    expect(container.querySelectorAll("[data-image-warm-state]").length).toBeLessThanOrEqual(4);
  });

  it("does not reassign URLs or decode again on an equivalent rerender", async () => {
    const { container, rerender } = render(<Harness />);
    await enter(container);
    const calls = decode.mock.calls.length;
    const assign = vi.spyOn(Element.prototype, "setAttribute");
    rerender(<Harness />);
    await enter(container);
    expect(decode).toHaveBeenCalledTimes(calls);
    expect(assign.mock.calls.filter(([attribute]) => ["src", "srcset", "sizes"].includes(attribute))).toHaveLength(0);
  });

  it("cleans the old edition and resets distant sources even when React reuses nodes", async () => {
    const { container, rerender } = render(<Harness />);
    await enter(container);
    rerender(<Harness index={6} />);
    await act(async () => {});
    const oldObserver = observers[0];
    rerender(<Harness edition="two" />);
    expect(oldObserver.disconnect).toHaveBeenCalledOnce();
    const images = [...container.querySelectorAll("img")];
    expect(images[6]).not.toHaveAttribute("src");
    await enter(container);
    expect(images[0].src).toContain("/two/");
    expect(images[2].src).toContain("/two/");
    expect(images[6]).not.toHaveAttribute("src");
  });

  it("disconnects observers and removes image listeners on unmount; stale promises do nothing", async () => {
    let finish;
    decode.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { container, unmount } = render(<Harness />);
    await enter(container);
    const image = container.querySelector("img");
    const remove = vi.spyOn(image, "removeEventListener");
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("load", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("error", expect.any(Function));
    await act(async () => finish());
    expect(image).not.toHaveAttribute("data-image-warm-state");
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("handles decode rejection without blocking navigation or background preparation", async () => {
    decode.mockRejectedValue(new Error("decode unavailable"));
    const { container, rerender } = render(<Harness />);
    container.querySelectorAll("img").forEach(image => {
      Object.defineProperty(image, "complete", { configurable: true, value: true });
      Object.defineProperty(image, "naturalWidth", { configurable: true, value: 720 });
    });
    await enter(container);
    expect(container.querySelector("img")).toHaveAttribute("data-image-warm-state", "loaded");
    expect(container.querySelectorAll("img")[2]).toHaveAttribute("src");
    rerender(<Harness index={2} />);
    await act(async () => {});
    expect(container.querySelectorAll("img")[3]).toHaveAttribute("src");
  });

  it("uses load as a fallback when decode is unavailable", async () => {
    delete HTMLImageElement.prototype.decode;
    const { container } = render(<Harness />);
    const image = container.querySelector("img");
    Object.defineProperty(image, "complete", { configurable: true, value: false });
    await enter(container);
    act(() => image.dispatchEvent(new Event("load")));
    expect(image).toHaveAttribute("data-image-warm-state", "loaded");
  });

  it("cancels progressive work when leaving the proximity zone", async () => {
    const finish = [];
    decode.mockImplementation(() => new Promise(resolve => finish.push(resolve)));
    const { container } = render(<Harness />);
    await enter(container);
    await act(async () => observers[0].callback([{ isIntersecting: false }]));
    await act(async () => finish.forEach(resolve => resolve()));
    expect(container.querySelectorAll("img")[2]).not.toHaveAttribute("src");
    expect(container.querySelectorAll("[data-image-warm-state]")).toHaveLength(0);
  });

  it("does not prepare unresolved client data", async () => {
    const { rerender } = render(<Harness enabled={false} />);
    expect(observers).toHaveLength(0);
    expect(decode).not.toHaveBeenCalled();
    rerender(<Harness />);
    expect(observers).toHaveLength(1);
  });

  it("preserves responsive candidates exactly, including sizes and encoded stable URLs", () => {
    const props = warmImageProps(items[3], sizes, 3);
    expect(props.src).toBeUndefined();
    expect(props["data-image-warm-srcset"]).toContain("3-720.webp 720w");
    expect(props["data-image-warm-srcset"]).toContain("3.jpg 2000w");
    expect(props["data-image-warm-sizes"]).toBe(sizes);
    const first = warmImageProps(items[3], sizes, 0);
    expect(first.src).toBe(props["data-image-warm-src"]);
    expect(first.srcSet).toBe(props["data-image-warm-srcset"]);
  });

  it("does not assign fallback image sources while published client data is unresolved", () => {
    const props = warmImageProps(items[0], sizes, 0, false);
    expect(props.src).toBeUndefined();
    expect(props.srcSet).toBeUndefined();
    expect(props["data-image-warm-src"]).toContain("0-1600.webp");
  });

  it("assigns responsive sizes and candidates before src on the rendered element", async () => {
    function ResponsiveHarness() {
      const containerRef = useRef(null);
      useImageWarmPreload({ containerRef, mediaKey: "responsive", activeIndex: 3 });
      return <div ref={containerRef}><div>{items.slice(0, 6).map((item, index) =>
        <div key={item.id}><img {...warmImageProps(item, sizes, index)} alt="" loading="lazy" /></div>,
      )}</div></div>;
    }
    const { container } = render(<ResponsiveHarness />);
    const target = container.querySelectorAll("img")[3];
    const assign = vi.spyOn(target, "setAttribute");
    await enter(container);
    expect(assign.mock.calls.filter(([name]) => ["sizes", "srcset", "src"].includes(name)).map(([name]) => name)).toEqual(["sizes", "srcset", "src"]);
    expect(target.srcset).toBe(target.dataset.imageWarmSrcset);
    expect(target.sizes).toBe(sizes);
  });

  it("prepares a visible section at mount without waiting for the observer callback", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 390, height: 600, top: 100, bottom: 700 });
    const { container } = render(<Harness />);
    await act(async () => {});
    expect(container.querySelector("img")).toHaveAttribute("data-image-warm-state", "ready");
  });

  it("has a bounded fallback when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Harness />);
    await act(async () => {});
    expect(container.querySelectorAll("[data-image-warm-state]")).toHaveLength(3);
    expect(container.querySelectorAll("img")[3]).not.toHaveAttribute("src");
  });

  it("continues after an image network error and releases listeners", async () => {
    delete HTMLImageElement.prototype.decode;
    const { container } = render(<Harness />);
    const images = [...container.querySelectorAll("img")];
    images.forEach(image => Object.defineProperty(image, "complete", { configurable: true, value: false }));
    await enter(container);
    await act(async () => {
      images[0].dispatchEvent(new Event("error"));
      images[1].dispatchEvent(new Event("load"));
    });
    expect(images[0]).toHaveAttribute("data-image-warm-state", "error");
    expect(images[2]).toHaveAttribute("src");
  });

  it("moves the preload window during native scrolling with reduced motion and cleans its listener", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
    function NativeHarness() {
      const containerRef = useRef(null);
      useImageWarmPreload({ containerRef, mediaKey: "native", ahead: 2 });
      return <div ref={containerRef}><div className="project-media__phone-screen"><div>{items.slice(0, 8).map((item, index) =>
        <div key={item.id}><img {...warmImageProps(item, sizes, index)} alt="" loading="lazy" /></div>,
      )}</div></div></div>;
    }
    const { container, unmount } = render(<NativeHarness />);
    const scroller = container.querySelector(".project-media__phone-screen");
    const firstSlide = scroller.firstChild.firstChild;
    vi.spyOn(firstSlide, "getBoundingClientRect").mockReturnValue({ width: 300 });
    await enter(container);
    scroller.scrollLeft = 900;
    await act(async () => scroller.dispatchEvent(new Event("scroll")));
    const images = [...container.querySelectorAll("img")];
    expect(images[3]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[4]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[7]).not.toHaveAttribute("data-image-warm-state");
    const remove = vi.spyOn(scroller, "removeEventListener");
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
