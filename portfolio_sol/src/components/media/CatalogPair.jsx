import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../../animations/gsap";
import { portfolioMediaUrl } from "../../lib/portfolioMedia";

export function CatalogPair({ items }) {
  const pairRef = useRef(null);

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
                {catalog.pages.map((page) => (
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
                      src={portfolioMediaUrl(page.src)}
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
