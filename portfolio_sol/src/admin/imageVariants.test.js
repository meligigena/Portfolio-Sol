import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebImageVariants, isStaticWebRaster } from "./imageVariants";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("createWebImageVariants", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("preserves a %s source and produces useful high quality WebP widths", async (type) => {
    const source = new File([new Uint8Array(1000)], "original.jpg", { type });
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2400, height: 1350, close })));
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag !== "canvas") return originalCreate(tag);
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (callback, type, quality) => {
          expect(type).toBe("image/webp");
          expect(quality).toBe(0.9);
          callback(new Blob([new Uint8Array(100)], { type }));
        },
      };
    });

    const variants = await createWebImageVariants(source);

    expect(variants.map(({ width, height }) => [width, height])).toEqual([
      [720, 405],
      [1600, 900],
    ]);
    expect(source.name).toBe("original.jpg");
    expect(source.size).toBe(1000);
    expect(close).toHaveBeenCalledOnce();
  });

  it("uses the same pipeline for a static WebP and skips small sources", async () => {
    const source = new File(["RIFF0000WEBP"], "ready.webp", { type: "image/webp" });
    const decode = vi.fn(async () => ({ width: 720, height: 900, close: vi.fn() }));
    vi.stubGlobal("createImageBitmap", decode);
    expect(await isStaticWebRaster(source)).toBe(true);
    expect(await createWebImageVariants(source)).toEqual([]);
    expect(decode).toHaveBeenCalledWith(source);
  });

  it.each([
    ["image/webp", "RIFF0000WEBPANIM0000"],
    ["image/png", "00000000\u0000\u0000\u0000\u0000acTL0000"],
    ["image/avif", "\u0000\u0000\u0000\u0010ftypavis0000"],
  ])("preserves animated %s without decoding it", async (type, contents) => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    expect(await createWebImageVariants(new File([contents], "animation", { type }))).toEqual([]);
    expect(decode).not.toHaveBeenCalled();
  });

  it("skips SVG", async () => {
    expect(await createWebImageVariants(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }))).toEqual([]);
  });

  it("keeps animated GIF uploads from becoming static WebP images", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const source = new File(["gif"], "animation.gif", { type: "image/gif" });

    expect(await createWebImageVariants(source)).toEqual([]);
    expect(decode).not.toHaveBeenCalled();
  });
});
