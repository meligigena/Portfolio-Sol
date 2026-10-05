import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../../animations/gsap";
import { imageSequenceKey, warmImageProps } from "../../lib/imageWarmPreload";
import { useImageWarmPreload } from "./useImageWarmPreload";
import { usePortfolioData } from "../../data/PortfolioDataContext";

function pairItems(items) {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
    items.slice(index * 2, index * 2 + 2),
  );
}

export function CarouselPairs({ items }) {
  return (
    <div className="carousel-pairs">
      {pairItems(items).map((pair) => (
        <CarouselPair
          items={pair}
          key={pair.map((carousel) => carousel.id).join("-")}
        />
      ))}
    </div>
  );
}

function CarouselPair({ items }) {
  const pairRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({ key: "", index: 0 });
  const { source: dataSource } = usePortfolioData();
  const imageSizes = "(max-width: 48rem) 92vw, 512px";
  const imageKey = imageSequenceKey(items.map((carousel) => carousel.items), imageSizes);
  useImageWarmPreload({
    containerRef: pairRef,
    mediaKey: imageKey,
    activeIndex: imagePosition.key === imageKey ? imagePosition.index : 0,
    enabled: dataSource !== "loading",
  });

  useGSAP(
    (context, contextSafe) => {
      const pair = pairRef.current;
      const pin = pair?.querySelector(".carousel-pair__pin");
      const carousels = gsap.utils.toArray("[data-carousel]", pair);
      const tracks = carousels.map((carousel) =>
        carousel.querySelector("[data-carousel-track]"),
      );
      const slideCounts = carousels.map(
        (carousel) => carousel.querySelectorAll("[data-carousel-slide]").length,
      );
      const stepCount = Math.max(0, ...slideCounts);
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (!pin || stepCount < 2) {
          return;
        }

        gsap.set(tracks, { xPercent: 0 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: pair,
            pin,
            start: "top top",
            end: () =>
              `+=${(stepCount - 1) * Math.max(window.innerHeight * 0.68, 440)}`,
            scrub: 0.8,
            onUpdate: (self) => {
              const index = Math.min(stepCount - 1, Math.ceil(self.progress * (stepCount - 1)));
              setImagePosition((previous) => previous.key === imageKey && previous.index === index
                ? previous : { key: imageKey, index });
            },
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        for (let step = 1; step < stepCount; step += 1) {
          tracks.forEach((track, carouselIndex) => {
            if (track && step < slideCounts[carouselIndex]) {
              timeline.to(
                track,
                { xPercent: -100 * step, duration: 1, ease: "none" },
                step - 1,
              );
            }
          });
        }
      });

      const refresh = contextSafe(() => ScrollTrigger.refresh());
      const images = [...(pair?.querySelectorAll("img") ?? [])];
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
    <div className="carousel-pair" data-carousel-pair ref={pairRef}>
      <div className="carousel-pair__pin">
        <div className={`carousel-pair__grid${items.length === 1 ? " is-single" : ""}`}>
          {items.map((carousel) => (
            <figure
              aria-label={carousel.label}
              className="project-media project-media--scroll-carousel"
              data-carousel
              data-media-kind="carousel"
              key={carousel.id}
            >
              <div className="project-media__carousel-window">
                <div className="project-media__carousel-track" data-carousel-track>
                  {carousel.items.map((item, index) => (
                    <div
                      className="project-media__carousel-slide"
                      data-carousel-slide
                      key={item.id}
                    >
                      <img
                        alt={item.alt}
                        decoding="async"
                        height={item.height}
                        loading="lazy"
                        {...warmImageProps(item, imageSizes, index, dataSource !== "loading")}
                        width={item.width}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <figcaption data-carousel-label>CARRUSEL</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
