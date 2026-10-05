import { portfolioMediaUrl } from "./portfolioMedia";

export function responsiveImageProps(item, sizes) {
  const variants = (item.config?.webVariants ?? [])
    .filter((variant) => Number.isInteger(variant.width) && variant.width > 0 && variant.path)
    .sort((left, right) => left.width - right.width);
  if (variants.length === 0) return { src: portfolioMediaUrl(item.src) };

  const largest = variants.at(-1);
  const candidates = variants.map((variant) =>
    `${portfolioMediaUrl(variant.path)} ${variant.width}w`,
  );
  if (item.width > largest.width) {
    candidates.push(`${portfolioMediaUrl(item.src)} ${item.width}w`);
  }

  return {
    src: portfolioMediaUrl(largest.path),
    srcSet: candidates.join(", "),
    sizes,
  };
}
