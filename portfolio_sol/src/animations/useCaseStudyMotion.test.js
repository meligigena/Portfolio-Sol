import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollCaseStudyToTop } from "./useCaseStudyMotion";

describe("case study mobile scroll reset", () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollTo = window.scrollTo;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.scrollTo = originalScrollTo;
    document.documentElement.style.scrollBehavior = "";
  });

  it("bypasses global smooth scrolling and restores it after resetting mobile scroll", () => {
    const scrollBehaviors = [];
    document.documentElement.style.scrollBehavior = "smooth";
    window.matchMedia = vi.fn(() => ({ matches: true }));
    window.scrollTo = vi.fn(() => {
      scrollBehaviors.push(document.documentElement.style.scrollBehavior);
    });

    scrollCaseStudyToTop();

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 48rem)");
    expect(scrollBehaviors).toEqual(["auto"]);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
  });

  it("keeps the existing scroll behavior outside the mobile breakpoint", () => {
    document.documentElement.style.scrollBehavior = "smooth";
    window.matchMedia = vi.fn(() => ({ matches: false }));
    window.scrollTo = vi.fn();

    scrollCaseStudyToTop();

    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  });
});
