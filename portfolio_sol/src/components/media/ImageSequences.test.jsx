import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorySequence } from "./StorySequence";
import { CarouselPairs } from "./CarouselPairs";
import { CatalogPair } from "./CatalogPair";

const { triggers } = vi.hoisted(() => ({ triggers: [] }));
vi.mock("../../animations/gsap", async () => {
  const { useEffect } = await import("react");
  const animation = (options) => { if (options?.scrollTrigger) triggers.push(options.scrollTrigger); };
  return {
    // Mirror GSAP's explicit dependency contract in this isolated animation mock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useGSAP: (callback, options) => useEffect(() => callback({}, (fn) => fn), options.dependencies),
    ScrollTrigger: { refresh: vi.fn() },
    gsap: {
      set: vi.fn(),
      to: (_target, options) => animation(options),
      utils: { toArray: (selector, root) => typeof selector === "string" ? [...root.querySelectorAll(selector)] : [...selector] },
      matchMedia: () => ({ add: (_query, callback) => callback(), revert: vi.fn() }),
      timeline: (options) => { animation(options); return { to: vi.fn() }; },
    },
  };
});

let observers;
let decode;
const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
const pages = Array.from({ length: 8 }, (_, index) => ({ id: `image-${index}`, src: `example/images/${index}.jpg`, alt: `Image ${index}`, width: 1080, height: 1920 }));

beforeEach(() => {
  triggers.length = 0;
  observers = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback, options) { this.callback = callback; this.options = options; this.disconnect = vi.fn(); observers.push(this); }
    observe() {}
  });
  decode = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
});

afterEach(() => {
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else delete HTMLImageElement.prototype.decode;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("public image sequence preparation", () => {
  it("decodes upcoming Stories before advancing instead of waiting for lazy loading", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
    const { container } = render(<StorySequence projects={pages} />);
    const images = [...container.querySelectorAll("[data-story-slide] img")];
    const near = observers.find(o => o.options?.rootMargin === "800px 0px" && o.options.threshold === 0);
    await act(async () => near?.callback([{ target: container.firstChild, isIntersecting: true }]));
    expect(decode).toHaveBeenCalled();
    expect(images[1]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[2]).toHaveAttribute("src", expect.stringContaining("/2.jpg"));
    expect(images[4]).not.toHaveAttribute("src");
    act(() => triggers[0].onUpdate({ progress: 3 / 7 }));
    expect(images[4]).toHaveAttribute("src", expect.stringContaining("/4.jpg"));
    expect(container.querySelectorAll("[data-story-slide] img")[4]).toBe(images[4]);
  });

  it.each([
    ["carousel", (items) => <CarouselPairs items={items} />, "[data-carousel-slide] img", "items"],
    ["catalog", (items) => <CatalogPair items={items} />, "[data-catalog-page] img", "pages"],
  ])("prepares both %s rows at the same upcoming step", async (_kind, component, selector, field) => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
    const { container } = render(component([{ id: "a", label: "A", [field]: pages }, { id: "b", label: "B", [field]: pages.slice(0, 5) }]));
    const near = observers.find(o => o.options?.rootMargin === "800px 0px");
    await act(async () => near?.callback([{ target: container.firstChild, isIntersecting: true }]));
    const images = [...container.querySelectorAll(selector)];
    expect(images[1]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[9]).toHaveAttribute("data-image-warm-state", "ready");
    // A partially visible incoming slide needs its own next neighbor prepared.
    act(() => triggers[0].onUpdate({ progress: 0.01 }));
    await act(async () => {});
    expect(images[2]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[10]).toHaveAttribute("data-image-warm-state", "ready");
    act(() => triggers[0].onUpdate({ progress: 2 / 7 }));
    await act(async () => {});
    expect(images[3]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[11]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[7]).not.toHaveAttribute("src");
  });

  it("resets the Stories index when content changes to a new edition", async () => {
    const { container, rerender } = render(<StorySequence projects={pages} />);
    const near = observers.find(o => o.options?.rootMargin === "800px 0px" && o.options.threshold === 0);
    await act(async () => near.callback([{ isIntersecting: true }]));
    act(() => triggers[0].onUpdate({ progress: 5 / 7 }));
    await act(async () => {});
    const oldObserver = near;
    rerender(<StorySequence projects={pages.map(page => ({ ...page, src: `edition-two/${page.src}` }))} />);
    expect(oldObserver.disconnect).toHaveBeenCalledOnce();
    const nextObserver = observers.filter(o => o.options?.rootMargin === "800px 0px" && o.options.threshold === 0).at(-1);
    await act(async () => nextObserver.callback([{ isIntersecting: true }]));
    const images = [...container.querySelectorAll("[data-story-slide] img")];
    expect(images[0].src).toContain("/edition-two/");
    expect(images[1]).toHaveAttribute("data-image-warm-state", "ready");
    expect(images[5]).not.toHaveAttribute("src");
  });
});
