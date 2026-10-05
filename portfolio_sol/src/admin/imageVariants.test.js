import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebImageVariants } from "./imageVariants";

afterEach(() => vi.unstubAllGlobals());

describe("createWebImageVariants", () => {
  it("preserves the source and produces useful high quality WebP widths", async () => {
    const source = new File([new Uint8Array(1000)], "original.jpg", { type: "image/jpeg" });
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

  it("does not recompress an existing WebP", async () => {
    const source = new File(["webp"], "ready.webp", { type: "image/webp" });
    expect(await createWebImageVariants(source)).toEqual([]);
  });

  it("keeps animated GIF uploads from becoming static WebP images", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const source = new File(["gif"], "animation.gif", { type: "image/gif" });

    expect(await createWebImageVariants(source)).toEqual([]);
    expect(decode).not.toHaveBeenCalled();
  });
});
