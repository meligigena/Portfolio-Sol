import { useRef } from "react";
import { gsap, useGSAP } from "../../animations/gsap";
import { ProjectMedia } from "./ProjectMedia";

export function PostGrid({ items = [] }) {
  const gridRef = useRef(null);
  const postPairs = Array.from(
    { length: Math.ceil(items.length / 2) },
    (_, pairIndex) => items.slice(pairIndex * 2, pairIndex * 2 + 2),
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add(
        "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils.toArray("[data-post-pair]", gridRef.current).forEach((pair) => {
            const posts = gsap.utils.toArray(
              pair.querySelectorAll('[data-media-kind="post"]'),
            );
            const isSingle = posts.length === 1;

            gsap.fromTo(
              posts,
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
          gsap.utils
            .toArray('[data-media-kind="post"]', gridRef.current)
            .forEach((post, index) => {
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

      return () => media.revert();
    },
    { dependencies: [items], scope: gridRef, revertOnUpdate: true },
  );

  return (
    <div className="case-study__feed" ref={gridRef}>
      {postPairs.map((pair, pairIndex) => (
        <div
          className={`case-study__post-pair${pair.length === 1 ? " is-single" : ""}`}
          data-feed-block="postPair"
          data-post-pair
          key={pair.map((project) => project.id).join("-")}
        >
          {pair.map((project, itemIndex) => (
            <ProjectMedia
              project={project}
              index={pairIndex * 2 + itemIndex}
              key={project.id}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
