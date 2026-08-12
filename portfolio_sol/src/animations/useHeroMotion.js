import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

export function useHeroMotion(networkFontReady = true) {
  const heroRef = useRef(null);

  useGSAP(
    (context, contextSafe) => {
      if (!networkFontReady) {
        return undefined;
      }

      const media = gsap.matchMedia();

      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reducedMotion: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          if (conditions.reducedMotion) {
            return;
          }

          const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

          intro
            .from(".hero__eyebrow", {
              autoAlpha: 0,
              y: 20,
              duration: 0.6,
            })
            .fromTo(
              ".hero__title",
              {
                "--hero-title-reveal": "-8%",
              },
              {
                "--hero-title-reveal": "120%",
                duration: 1.05,
                ease: "power2.out",
              },
              0.08,
            )
            .from(
              ".hero__footer",
              {
                autoAlpha: 0,
                y: 16,
                duration: 0.55,
              },
              0.45,
            );

          gsap
            .timeline({
              scrollTrigger: {
                id: "hero-compression",
                trigger: heroRef.current,
                start: "top top",
                end: "bottom top",
                scrub: 0.7,
              },
            })
            .to(".hero__title-stage", {
              yPercent: -8,
              scale: 0.92,
              transformOrigin: "left center",
              ease: "none",
            });
        },
      );

      const refreshAfterFonts = contextSafe(() => ScrollTrigger.refresh());
      document.fonts?.ready.then(refreshAfterFonts);

      return () => media.revert();
    },
    {
      dependencies: [networkFontReady],
      revertOnUpdate: true,
      scope: heroRef,
    },
  );

  return heroRef;
}
