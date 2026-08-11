import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

export function useSectionReveal() {
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray("[data-reveal]").forEach((item) => {
          gsap.from(item, {
            autoAlpha: 0,
            y: 36,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
        });
      });

      return () => media.revert();
    },
    { scope: sectionRef },
  );

  return sectionRef;
}
