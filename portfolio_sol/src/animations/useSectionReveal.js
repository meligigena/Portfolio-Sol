import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

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

export function useContactReveal() {
  const sectionRef = useRef(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add(
        {
          isDesktop: "(min-width: 45.01rem)",
          isMobile: "(max-width: 45rem)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          if (conditions.reduceMotion) return;

          const section = sectionRef.current;
          const title = section.querySelector("[data-contact-title]");
          const divider = section.querySelector("[data-contact-divider]");
          const intro = section.querySelector("[data-contact-intro]");
          const actions = section.querySelectorAll("[data-contact-action]");
          const compact = conditions.isMobile && !conditions.isDesktop;
          let sectionTop = section.getBoundingClientRect().top + window.scrollY;
          let refreshFrame;
          let active = true;

          gsap
            .timeline({
              scrollTrigger: {
                id: "contact-reveal",
                trigger: section,
                start: "top 80%",
                toggleActions: "play none none reverse",
              },
            })
            .from(title, {
              autoAlpha: 0,
              y: compact ? 28 : 36,
              duration: 0.82,
              ease: "power3.out",
            })
            .from(
              divider,
              {
                scaleX: 0,
                transformOrigin: "left center",
                duration: 0.7,
                ease: "power2.out",
              },
              0.08,
            )
            .from(
              intro,
              {
                autoAlpha: 0,
                y: compact ? 16 : 20,
                duration: 0.62,
                ease: "power3.out",
              },
              0.32,
            )
            .from(
              actions,
              {
                autoAlpha: 0,
                y: compact ? 14 : 18,
                duration: 0.62,
                ease: "power3.out",
                stagger: 0.1,
              },
              0.48,
            );

          const refreshIfSectionMoved = () => {
            if (!active) return;

            window.cancelAnimationFrame(refreshFrame);
            refreshFrame = window.requestAnimationFrame(() => {
              const nextSectionTop =
                section.getBoundingClientRect().top + window.scrollY;

              if (Math.abs(nextSectionTop - sectionTop) < 1) return;

              sectionTop = nextSectionTop;
              ScrollTrigger.refresh();
              sectionTop = section.getBoundingClientRect().top + window.scrollY;
            });
          };

          const layoutObserver = new ResizeObserver(refreshIfSectionMoved);
          layoutObserver.observe(section.parentElement);
          document.fonts?.ready.then(refreshIfSectionMoved);

          return () => {
            active = false;
            window.cancelAnimationFrame(refreshFrame);
            layoutObserver.disconnect();
          };
        },
      );

      return () => media.revert();
    },
    { scope: sectionRef },
  );

  return sectionRef;
}
