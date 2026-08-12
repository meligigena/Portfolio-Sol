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

  it("increases only the mobile Portfolio heading line-height", () => {
    const styles = readFileSync("src/styles/portfolio.css", "utf8");
    const mobile = styles.match(
      /@media \(max-width: 40rem\)\s*{[\s\S]+?\.portfolio-rail__header h2\s*{[^}]+}/,
    )?.[0] ?? "";

    expect(mobile).toContain("line-height: 0.88");
  });

  it("uses scoped batched card reveals with reduced-motion exclusion and cleanup", () => {
    const source = readFileSync("src/animations/usePortfolioRail.js", "utf8");

    expect(source).toContain("[data-client-card]");
    expect(source).toContain("ScrollTrigger.batch");
    expect(source).toContain("prefers-reduced-motion: no-preference");
    expect(source).toContain("media.revert()");
    expect(source).toContain("scope: sectionRef");
  });
});
