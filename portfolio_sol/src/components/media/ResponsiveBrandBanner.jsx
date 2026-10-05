import { useRef } from "react";
import { gsap, useGSAP } from "../../animations/gsap";
import { responsiveImageProps } from "../../lib/responsiveImage";

export function ResponsiveBrandBanner({ items, presentation, priority = false }) {
  const rootRef = useRef(null);
  const desktop = items.find((item) => item.viewport === "desktop");
  const mobile = items.find((item) => item.viewport === "mobile");
  const fallback = desktop ?? mobile;
  const fallbackImage = fallback ? responsiveImageProps(fallback, "100vw") : null;
  const mobileImage = mobile ? responsiveImageProps(mobile, "100vw") : null;

  useGSAP(
    () => {
      if (!fallback) return undefined;
      const media = gsap.matchMedia();
      const createReveal = (initialClipPath) => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 88%",
            end: "top 28%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        timeline
          .fromTo(
            "[data-brand-banner-mask]",
            { clipPath: initialClipPath },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "none" },
            0,
          )
          .fromTo(
            "[data-brand-banner-image]",
            { scale: 1.04 },
            { scale: 1, duration: 1, ease: "none" },
            0,
          );
      };

      media.add(
        "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
        () => createReveal("inset(0% 100% 0% 0%)"),
      );
      media.add(
        "(max-width: 47.99rem) and (prefers-reduced-motion: no-preference)",
        () => createReveal("inset(100% 0% 0% 0%)"),
      );

      return () => media.revert();
    },
    {
      dependencies: [desktop?.src, mobile?.src, fallback?.src],
      scope: rootRef,
      revertOnUpdate: true,
    },
  );

  if (!fallback) return null;

  return (
    <div
      className="case-study__brand-banner"
      data-brand-banner
      data-brand-banner-presentation={presentation}
      ref={rootRef}
    >
      <div className="case-study__brand-banner-mask" data-brand-banner-mask>
        <picture>
          {desktop && mobile && (
            <source
              media="(max-width: 47.99rem)"
              srcSet={mobileImage.srcSet ?? mobileImage.src}
              sizes={mobileImage.sizes}
            />
          )}
          <img
            alt={fallback.alt}
            data-brand-banner-image
            decoding="async"
            height={fallback.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            {...fallbackImage}
            width={fallback.width}
          />
        </picture>
      </div>
    </div>
  );
}
