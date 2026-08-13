import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("portfolio media and motion enhancements", () => {
  it("keeps non-critical portfolio images lazy and asynchronously decoded", () => {
    const about = readFileSync("src/sections/About.jsx", "utf8");
    const catalogs = readFileSync("src/components/media/CatalogPair.jsx", "utf8");
    const stories = readFileSync("src/components/media/StorySequence.jsx", "utf8");

    expect(about).toContain('loading="lazy"');
    expect(about).toContain('decoding="async"');
    expect(about).toContain('width="2208"');
    expect(about).toContain('height="1242"');
    expect(catalogs).not.toContain('loading={pageIndex === 0 ? "eager" : "lazy"}');
    expect(catalogs).toContain('loading="lazy"');
    expect(stories).toMatch(/project-media__phone-frame[\s\S]+loading="lazy"/);
  });

  it("keeps the About portrait compact when intrinsic dimensions are present", () => {
    const styles = readFileSync("src/styles/about.css", "utf8");
    const portraitImage = styles.match(/\.about__portrait-image\s*{[^}]+}/)?.[0] ?? "";

    expect(portraitImage).toContain("width: 100%");
    expect(portraitImage).toContain("height: auto");
    expect(portraitImage).toContain("aspect-ratio: 5 / 4");
    expect(portraitImage).toContain("object-fit: cover");
    expect(portraitImage).toContain("object-position: center");
  });

  it("increases only the mobile Portfolio heading line-height", () => {
    const styles = readFileSync("src/styles/portfolio.css", "utf8");
    const mobile = styles.match(
      /@media \(max-width: 40rem\)\s*{[\s\S]+?\.portfolio-rail__header h2\s*{[^}]+}/,
    )?.[0] ?? "";

    expect(mobile).toContain("line-height: 1.1");
  });

  it("keeps desktop rail motion unchanged and uses scrubbed card motion only on mobile", () => {
    const source = readFileSync("src/animations/usePortfolioRail.js", "utf8");
    const desktopStart = source.indexOf('"(min-width: 64rem)');
    const mobileStart = source.indexOf('"(max-width: 63.99rem)');
    const desktopMotion = source.slice(desktopStart, mobileStart);
    const mobileMotion = source.slice(mobileStart);

    expect(desktopMotion).not.toContain("[data-client-card]");
    expect(desktopMotion).not.toContain("gsap.fromTo");
    expect(source).not.toContain("ScrollTrigger.batch");
    expect(mobileMotion).toContain("[data-client-card]");
    expect(mobileMotion).toContain("scrub: 0.6");
    expect(mobileMotion).toContain("autoAlpha: 0.9");
    expect(mobileMotion).toContain("y: 18");
    expect(mobileMotion).toContain("scale: 0.985");
    expect(mobileMotion).toContain("prefers-reduced-motion: no-preference");
    expect(source).toContain("media.revert()");
    expect(source).toContain("scope: sectionRef");
  });
});
