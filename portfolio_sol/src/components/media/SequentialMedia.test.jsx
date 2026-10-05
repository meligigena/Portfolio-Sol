import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarouselPairs } from "./CarouselPairs";
import { CatalogPair } from "./CatalogPair";

const pages = Array.from({ length: 5 }, (_, index) => ({
  id: `page-${index}`,
  src: `example/pages/${index}.jpg`,
  alt: `Page ${index}`,
  width: 1080,
  height: 1350,
}));

describe("sequential media loading", () => {
  it("requests only the first two slides in a carousel before scrolling", () => {
    const { container } = render(
      <CarouselPairs items={[{ id: "carousel", label: "Carousel", items: pages }]} />,
    );
    const images = [...container.querySelectorAll("[data-carousel-slide] img")];

    expect(images).toHaveLength(5);
    expect(images.slice(0, 2).every((image) => image.hasAttribute("src"))).toBe(true);
    expect(images.slice(2).every((image) => !image.hasAttribute("src"))).toBe(true);
  });

  it("requests only the first two catalog pages before scrolling", () => {
    const { container } = render(
      <CatalogPair items={[{ id: "catalog", label: "Catalog", pages }]} />,
    );
    const images = [...container.querySelectorAll("[data-catalog-page] img")];

    expect(images).toHaveLength(5);
    expect(images.slice(0, 2).every((image) => image.hasAttribute("src"))).toBe(true);
    expect(images.slice(2).every((image) => !image.hasAttribute("src"))).toBe(true);
  });
});
