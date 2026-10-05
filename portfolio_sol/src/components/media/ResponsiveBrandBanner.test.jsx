import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsiveBrandBanner } from "./ResponsiveBrandBanner";

describe("ResponsiveBrandBanner loading", () => {
  it("prioritizes the banner when it is the first media section", () => {
    const { container } = render(
      <ResponsiveBrandBanner items={[{
        id: "banner",
        src: "example/banner.jpg",
        alt: "Banner",
        width: 1920,
        height: 900,
        viewport: "desktop",
      }]} priority />,
    );
    const image = container.querySelector("[data-brand-banner-image]");

    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });
});
