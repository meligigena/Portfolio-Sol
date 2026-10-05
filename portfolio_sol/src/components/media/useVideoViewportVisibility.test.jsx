import { useRef } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVideoViewportVisibility } from "./useVideoViewportVisibility";

afterEach(() => vi.unstubAllGlobals());

function Harness({ enabled, onVisible }) {
  const ref = useRef(null);
  useVideoViewportVisibility({ containerRef: ref, enabled, onVisible });
  return <div ref={ref}><video /></div>;
}

describe("useVideoViewportVisibility", () => {
  it("waits for published data before observing and playing a fallback video", () => {
    const observers = [];
    class MockIntersectionObserver {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const onVisible = vi.fn();
    const { container, rerender } = render(<Harness enabled={false} onVisible={onVisible} />);
    expect(observers).toHaveLength(0);

    rerender(<Harness enabled onVisible={onVisible} />);
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(container.querySelector("video"));
  });
});
