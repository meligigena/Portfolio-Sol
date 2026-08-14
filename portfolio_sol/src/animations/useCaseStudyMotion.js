import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

export function scrollCaseStudyToTop() {
  const scrollOptions = { top: 0, left: 0, behavior: "auto" };

  if (!window.matchMedia("(max-width: 48rem)").matches) {
    window.scrollTo(scrollOptions);
    return;
  }

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  try {
    window.scrollTo(scrollOptions);
  } finally {
    root.style.scrollBehavior = previousScrollBehavior;
  }
}

export function useCaseStudyMotion(clientSlug) {
  const pageRef = useRef(null);

  useGSAP(
    (context, contextSafe) => {
      scrollCaseStudyToTop();

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".case-study__intro > *", {
          autoAlpha: 0,
          y: 28,
          duration: 0.75,
          stagger: 0.08,
          ease: "power3.out",
        });

        gsap.utils.toArray('.project-media:not([data-media-kind="story"]):not([data-media-kind="post"])').forEach((mediaItem) => {
          gsap.from(mediaItem, {
            autoAlpha: 0,
            y: 54,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: mediaItem,
              start: "top 86%",
              toggleActions: "play none none reverse",
            },
          });
        });

      });

      media.add(
        "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils.toArray("[data-post-pair]").forEach((pair) => {
            const pairPosts = gsap.utils.toArray(pair.querySelectorAll('[data-media-kind="post"]'));
            const isSingle = pairPosts.length === 1;

            gsap.fromTo(
              pairPosts,
              {
                autoAlpha: 0.2,
                x: (index) => (isSingle ? 0 : index === 0 ? -110 : 110),
                y: 64,
                scale: 0.95,
              },
              {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: pair,
                  start: "top 92%",
                  end: "center 58%",
                  scrub: 0.8,
                },
              },
            );
          });
        },
      );

      media.add(
        "(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils.toArray('[data-media-kind="post"]').forEach((post, index) => {
            const direction = index % 2 === 0 ? -1 : 1;

            gsap.fromTo(
              post,
              {
                autoAlpha: 0.25,
                x: direction * 42,
                y: 48,
                scale: 0.97,
              },
              {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: post,
                  start: "top 94%",
                  end: "top 62%",
                  scrub: 0.65,
                },
              },
            );
          });
        },
      );

      const refresh = contextSafe(() => {
        scrollCaseStudyToTop();
        ScrollTrigger.refresh();
        scrollCaseStudyToTop();
      });
      let secondRefreshFrame = null;
      const firstRefreshFrame = requestAnimationFrame(() => {
        secondRefreshFrame = requestAnimationFrame(refresh);
      });

      return () => {
        cancelAnimationFrame(firstRefreshFrame);
        if (secondRefreshFrame) {
          cancelAnimationFrame(secondRefreshFrame);
        }
        pageRef.current
          ?.querySelectorAll("video")
          .forEach((video) => video.pause?.());
        media.revert();
      };
    },
    { dependencies: [clientSlug], scope: pageRef, revertOnUpdate: true },
  );

  return pageRef;
}
