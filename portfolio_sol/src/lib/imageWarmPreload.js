import { responsiveImageProps } from "./responsiveImage";

// Use the rendered image's candidates; the browser selects and caches one resource.
export function warmImageProps(item, sizes, index, enabled = true) {
  const props = responsiveImageProps(item, sizes);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    ...(enabled && (index < 2 || reducedMotion) ? props : {}),
    "data-image-warm-index": index,
    "data-image-warm-src": props.src,
    "data-image-warm-srcset": props.srcSet,
    "data-image-warm-sizes": props.sizes,
  };
}

export function imageSequenceKey(rows, sizes) {
  return JSON.stringify(rows.map((row) => row.map((item) => [item.id, responsiveImageProps(item, sizes)])));
}
