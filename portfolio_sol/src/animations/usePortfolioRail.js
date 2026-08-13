import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

export function usePortfolioRail(clientCount) {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const activeIndexRef = useRef(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add(
        "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
        () => {
          const section = sectionRef.current;
          const viewport = viewportRef.current;
          const track = trackRef.current;
          let currentIndex = -1;

          const getDistance = () =>
            Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.08);

          gsap.to(track, {
            x: () => -getDistance(),
            ease: "none",
            scrollTrigger: {
              id: "portfolio-horizontal",
              trigger: section,
              start: "top top",
              end: () => `+=${getDistance()}`,
              pin: viewport,
              scrub: 0.8,
              invalidateOnRefresh: true,
              onUpdate: ({ progress }) => {
                const nextIndex = Math.min(
                  clientCount - 1,
                  Math.round(progress * (clientCount - 1)),
                );

                if (nextIndex !== currentIndex) {
                  currentIndex = nextIndex;
                  section.dataset.activeIndex = String(nextIndex);
                  activeIndexRef.current.textContent = String(nextIndex + 1).padStart(
                    2,
                    "0",
                  );
                }
              },
            },
          });

        },
      );

      media.add(
        "(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)",
        () => {
          const cards = gsap.utils.toArray(
            "[data-client-card]",
            sectionRef.current,
          );

          cards.forEach((card, index) => {
            gsap.fromTo(
              card,
              { autoAlpha: 0.9, y: 18, scale: 0.985 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  id: `portfolio-mobile-card-${index}`,
                  trigger: card,
                  start: "top 92%",
                  end: "center 58%",
                  scrub: 0.6,
                  invalidateOnRefresh: true,
                },
              },
            );
          });
        },
      );

      return () => media.revert();
    },
    { scope: sectionRef, dependencies: [clientCount], revertOnUpdate: true },
  );

  return {
    sectionRef,
    viewportRef,
    trackRef,
    activeIndexRef,
  };
}
