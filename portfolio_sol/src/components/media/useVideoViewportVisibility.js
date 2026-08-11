import { useEffect, useRef } from "react";

export function useVideoViewportVisibility({
  containerRef,
  observeKey,
  onHidden,
  onVisible,
}) {
  const callbacksRef = useRef({ onHidden, onVisible });

  useEffect(() => {
    callbacksRef.current = { onHidden, onVisible };
  }, [onHidden, onVisible]);

  useEffect(() => {
    const videos = [...(containerRef.current?.querySelectorAll("video") ?? [])];

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        videos.forEach((video) => {
          video.muted = true;
          video.pause();
        });
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;

          video.dataset.viewportVisible = String(isVisible);

          if (isVisible) {
            callbacksRef.current.onVisible?.(video);
            return;
          }

          video.muted = true;
          video.pause();
          callbacksRef.current.onHidden?.(video);
        });
      },
      { threshold: 0.01 },
    );

    videos.forEach((video) => observer.observe(video));

    return () => {
      observer.disconnect();
      videos.forEach((video) => {
        video.muted = true;
        video.pause();
      });
    };
  }, [containerRef, observeKey]);
}
