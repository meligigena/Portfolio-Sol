const WEB_WIDTHS = [720, 1600];
const WEB_QUALITY = 0.9;

export async function createWebImageVariants(file) {
  if (!file || !["image/jpeg", "image/png"].includes(file.type)) {
    return [];
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return [];
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= WEB_WIDTHS[0]) return [];

    const widths = [...new Set(WEB_WIDTHS.map((width) => Math.min(width, bitmap.width)))];
    const variants = [];
    for (const width of widths) {
      const height = Math.round((bitmap.height * width) / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/webp", WEB_QUALITY),
      );
      if (!blob) throw new Error("WebP encoding failed.");
      if (blob.size < file.size * 0.9) {
        variants.push({ width, height, blob });
      }
    }
    return variants;
  } finally {
    bitmap.close();
  }
}
