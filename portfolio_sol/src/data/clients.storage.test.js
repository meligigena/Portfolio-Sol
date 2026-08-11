import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getClientBySlug } from "./clients";

describe("portfolio client Storage paths", () => {
  it("stores relative object paths instead of public or Supabase URLs", () => {
    const rambla = getClientBySlug("rambla");
    const sistemasMoviles = getClientBySlug("sistemas-moviles");

    expect(rambla.cover).toBe("rambla/logo.jpg");
    expect(rambla.projects.find((project) => project.type === "story").src).toBe(
      "rambla/stories/historias rambla (60).jpg",
    );
    expect(
      rambla.projects.find((project) => project.viewport === "desktop").src,
    ).toBe("rambla/banners/banner_horizontal.jpeg");
    expect(sistemasMoviles.cover).toBe("sistemas-moviles/logo.jpg");
  });

  it("uses the normalized Storage paths for both replaced videos", () => {
    const sistemasMoviles = getClientBySlug("sistemas-moviles");
    const maja = getClientBySlug("maja");
    const systemsReplacement = sistemasMoviles.projects.find(
      (project) => project.src.includes("0810(1).mp4"),
    );
    const majaReplacement = maja.projects.find((project) =>
      project.src.includes("copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4.mov"),
    );

    expect(systemsReplacement).toMatchObject(
      {
        src: "sistemas-moviles/videos/0810(1).mp4",
        width: 720,
        height: 1280,
      },
    );
    expect(majaReplacement).toMatchObject(
      {
        src: "maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4.mov",
        width: 1080,
        height: 1920,
      },
    );
  });

  it("does not retain or reference Rambla banner copies under public", () => {
    const source = [
      readFileSync("src/data/clients.js", "utf8"),
      readFileSync("src/components/media/ResponsiveBrandBanner.jsx", "utf8"),
    ].join("\n");

    expect(source).not.toContain("/portfolio/rambla/banners");
    expect(
      existsSync("public/portfolio/rambla/banners/banner_horizontal.jpeg"),
    ).toBe(false);
    expect(
      existsSync("public/portfolio/rambla/banners/banner_vertical.png"),
    ).toBe(false);
  });
});
