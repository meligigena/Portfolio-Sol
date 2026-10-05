import { afterEach, describe, expect, it, vi } from "vitest";
import { responsiveImageProps } from "./responsiveImage";

afterEach(() => vi.unstubAllEnvs());

describe("responsiveImageProps", () => {
  it("serves web widths while retaining the original for high density displays", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    const props = responsiveImageProps({
      src: "client/banner.png",
      width: 1920,
      config: { webVariants: [
        { width: 720, path: "client/banner-web-720.webp" },
        { width: 1600, path: "client/banner-web-1600.webp" },
      ] },
    }, "100vw");

    expect(props.src).toContain("banner-web-1600.webp");
    expect(props.srcSet).toContain("banner-web-720.webp 720w");
    expect(props.srcSet).toContain("banner-web-1600.webp 1600w");
    expect(props.srcSet).toContain("banner.png 1920w");
    expect(props.sizes).toBe("100vw");
  });

  it("uses the original unchanged when no web variant exists", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    const props = responsiveImageProps({ src: "client/story.jpg", width: 1080 }, "90vw");
    expect(props.src).toContain("client/story.jpg");
    expect(props.srcSet).toBeUndefined();
    expect(props.sizes).toBeUndefined();
  });
});
