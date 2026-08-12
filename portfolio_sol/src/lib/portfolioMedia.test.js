import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { portfolioMediaUrl } from "./portfolioMedia";

describe("portfolioMediaUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds an encoded public Storage URL from a relative object path", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project-ref.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_STORAGE_BUCKET", "portfolio-media");

    expect(
      portfolioMediaUrl("sistemas-moviles/videos/Copia de cámaras sistemas.mp4"),
    ).toBe(
      "https://project-ref.supabase.co/storage/v1/object/public/portfolio-media/sistemas-moviles/videos/Copia%20de%20c%C3%A1maras%20sistemas.mp4",
    );
  });

  it("does not double-encode an already encoded path segment", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project-ref.supabase.co");

    expect(portfolioMediaUrl("rambla/stories/historias%20rambla.mp4")).toBe(
      "https://project-ref.supabase.co/storage/v1/object/public/portfolio-media/rambla/stories/historias%20rambla.mp4",
    );
  });

  it("fails explicitly when the public Supabase URL is not configured", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");

    expect(() => portfolioMediaUrl("rambla/logo.jpg")).toThrow(
      "VITE_SUPABASE_URL",
    );
  });

  it("resolves the replaced Maja and Sistemas Móviles videos through Storage", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://project-ref.supabase.co");

    const systemsUrl = portfolioMediaUrl(
      "sistemas-moviles/videos/0810(1)-web-h264.mp4",
    );
    const majaUrl = portfolioMediaUrl(
      "maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4",
    );

    expect(systemsUrl).toBe(
      "https://project-ref.supabase.co/storage/v1/object/public/portfolio-media/sistemas-moviles/videos/0810(1)-web-h264.mp4",
    );
    expect(majaUrl).toBe(
      "https://project-ref.supabase.co/storage/v1/object/public/portfolio-media/maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4",
    );
    expect(systemsUrl).not.toContain("/public/portfolio/");
    expect(majaUrl).not.toContain("/public/portfolio/");
  });

  it("does not keep a special local fallback map", () => {
    const source = readFileSync("src/lib/portfolioMedia.js", "utf8");

    expect(source).not.toContain("LOCAL_MEDIA_URLS");
    expect(source).not.toContain('"/portfolio/');
  });

  it("does not keep local copies of the two replaced videos", () => {
    expect(
      existsSync(
        "public/portfolio/maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4",
      ),
    ).toBe(false);
    expect(
      existsSync(
        "public/portfolio/sistemas moviles/videos/0810(1)-web-h264.mp4",
      ),
    ).toBe(false);
  });
});
