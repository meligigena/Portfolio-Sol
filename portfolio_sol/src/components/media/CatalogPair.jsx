import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../../animations/gsap";
import { imageSequenceKey, warmImageProps } from "../../lib/imageWarmPreload";
import { useImageWarmPreload } from "./useImageWarmPreload";
import { usePortfolioData } from "../../data/PortfolioDataContext";

export function CatalogPair({ items }) {
  const pairRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({ key: "", index: 0 });
  const { source: dataSource } = usePortfolioData();
  const imageSizes = "(max-width: 48rem) 92vw, 480px";
  const imageKey = imageSequenceKey(items.map((catalog) => catalog.pages), imageSizes);
  useImageWarmPreload({
    containerRef: pairRef,
    mediaKey: imageKey,
    activeIndex: imagePosition.key === imageKey ? imagePosition.index : 0,
    enabled: dataSource !== "loading",
  });

  useGSAP(
    (context, contextSafe) => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const pair = pairRef.current;
        const pin = pair?.querySelector(".catalog-pair__pin");
        const catalogs = gsap.utils.toArray("[data-catalog]", pair);
        const pageSets = catalogs.map((catalog) =>
          gsap.utils.toArray("[data-catalog-page]", catalog),
        );
        const stepCount = Math.max(0, ...pageSets.map((pages) => pages.length));

        if (!pin || stepCount < 2) {
          return;
        }

        pageSets.forEach((pages) => {
          gsap.set(pages, {
            autoAlpha: 1,
            rotationY: 0,
            transformOrigin: "left center",
            zIndex: (index) => pages.length - index,
          });
        });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: pair,
            pin,
            start: "top top",
            end: () => `+=${(stepCount - 1) * Math.max(window.innerHeight * 0.72, 460)}`,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
            onUpdate: (self) => {
              const index = Math.min(stepCount - 1, Math.ceil(self.progress * (stepCount - 1)));
              setImagePosition((previous) => previous.key === imageKey && previous.index === index
                ? previous : { key: imageKey, index });
            },
          },
        });

        for (let step = 1; step < stepCount; step += 1) {
          const outgoingPages = pageSets.flatMap((pages) =>
            pages[step] ? [pages[step - 1]] : [],
          );

          timeline.to(
            outgoingPages,
            {
              autoAlpha: 0,
              duration: 1,
              ease: "power1.inOut",
              rotationY: -102,
              xPercent: -7,
            },
            step - 1,
          );
        }
      });

      const refresh = contextSafe(() => ScrollTrigger.refresh());
      const images = [...(pairRef.current?.querySelectorAll("img") ?? [])];
      const refreshFrame = requestAnimationFrame(refresh);

      images.forEach((image) => image.addEventListener("load", refresh, { once: true }));

      return () => {
        cancelAnimationFrame(refreshFrame);
        images.forEach((image) => image.removeEventListener("load", refresh));
        media.revert();
      };
    },
    { dependencies: [items], scope: pairRef, revertOnUpdate: true },
  );

  return (
    <div className="catalog-pair" data-catalog-pair ref={pairRef}>
      <div className="catalog-pair__pin">
        <div className="catalog-pair__books">
          {items.map((catalog) => (
            <article
              aria-label={catalog.label}
              className="catalog-pair__catalog"
              data-catalog
              key={catalog.id}
            >
              <div className="catalog-pair__pages">
                {catalog.pages.map((page, index) => (
                  <figure
                    className="catalog-pair__page"
                    data-catalog-page
                    key={page.id}
                  >
                    <img
                      alt={page.alt}
                      decoding="async"
                      height={page.height}
                      loading="lazy"
                      {...warmImageProps(page, imageSizes, index, dataSource !== "loading")}
                      width={page.width}
                    />
                  </figure>
                ))}
              </div>
              <p className="catalog-pair__label">{catalog.label}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
