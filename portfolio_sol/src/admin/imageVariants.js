const WEB_WIDTHS = [720, 1600];
const WEB_QUALITY = 0.9;

export const WEB_RASTER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"];

async function sourceBytes(file) {
  if (file.arrayBuffer) return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function isStaticWebRaster(file) {
  if (!file || !WEB_RASTER_TYPES.includes(file.type)) return false;
  if (["image/jpeg", "image/bmp"].includes(file.type)) return true;
  const bytes = await sourceBytes(file);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  // Never flatten animated PNG/WebP/AVIF assets into a still image.
  if (file.type === "image/png") {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      if (tag(offset + 4) === "acTL") return false;
      offset += 12 + view.getUint32(offset);
    }
  } else if (file.type === "image/webp") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunk = tag(offset);
      if (chunk === "ANIM" || chunk === "ANMF" || (chunk === "VP8X" && (bytes[offset + 8] & 2))) return false;
      const size = view.getUint32(offset + 4, true);
      offset += 8 + size + (size % 2);
    }
  } else if (file.type === "image/avif") {
    if (bytes.length < 16 || tag(4) !== "ftyp") return false;
    const size = Math.min(view.getUint32(0), bytes.length);
    for (let offset = 8; offset + 4 <= size; offset += 4) {
      if (tag(offset) === "avis") return false;
    }
  }
  return true;
}

export async function createWebImageVariants(file) {
  if (!await isStaticWebRaster(file)) {
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
