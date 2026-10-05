import { useCallback, useEffect, useRef } from "react";

const WARM_MARGIN = "800px 0px";
const STARTUP_LIMIT = 2;

function visibleAtMount(target, sequence) {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const row = sequence ? null : target.closest(".case-study__media-row-viewport")?.getBoundingClientRect();
  const width = Math.max(0, Math.min(rect.right, row?.right ?? window.innerWidth, window.innerWidth) -
    Math.max(rect.left, row?.left ?? 0, 0));
  const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  return sequence ? width > 0 && height > 0 : width * height >= rect.width * rect.height * 0.25;
}

export function useVideoWarmPreload({
  containerRef,
  enabled = true,
  mediaKey,
  activeIndex = null,
  onPrepared,
}) {
  const settings = useRef({ activeIndex, onPrepared });
  const refresh = useRef(null);

  useEffect(() => {
    settings.current = { activeIndex, onPrepared };
    refresh.current?.();
  }, [activeIndex, onPrepared]);

  useEffect(() => {
    const container = containerRef.current;
    const videos = [...(container?.querySelectorAll("video") ?? [])];
    if (!enabled || videos.length === 0) return undefined;

    let disposed = false;
    let criticalReady = !document.fonts || document.fonts.status === "loaded";
    const near = new Set();
    const buffered = new Set();
    const admitted = new Set();

    const update = () => {
      if (disposed) return;
      const index = settings.current.activeIndex;
      const sequence = index !== null;
      const candidates = !criticalReady ? [] : sequence
        ? near.size > 0 ? videos.slice(index, index + (buffered.has(videos[index]) ? 2 : 1)) : []
        : videos.filter((video) => near.has(video));
      const pending = candidates.filter((video) => !buffered.has(video)).slice(0, STARTUP_LIMIT);

      videos.forEach((video, videoIndex) => {
        const wanted = candidates.includes(video);
        const allowed = wanted && (buffered.has(video) || pending.includes(video));
        const preload = !allowed ? "none"
          : (sequence && videoIndex === index) || pending.includes(video) ? "auto" : "metadata";
        if (video.preload !== preload) video.preload = preload;
        video.dataset.videoLoadAllowed = String(allowed);
        if (allowed && !admitted.has(video)) {
          admitted.add(video);
          settings.current.onPrepared?.(video);
        } else if (!allowed) {
          admitted.delete(video);
        }
      });
    };
    refresh.current = update;

    const onBuffered = (event) => {
      if (event.target.readyState >= 3) buffered.add(event.target);
      update();
    };
    videos.forEach((video) => {
      if (video.readyState >= 3) buffered.add(video);
      video.addEventListener("canplay", onBuffered);
    });

    const sequence = settings.current.activeIndex !== null;
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (sequence || entry.intersectionRatio >= 0.25)) near.add(entry.target);
          else near.delete(entry.target);
        });
        update();
      },
      { rootMargin: WARM_MARGIN, threshold: sequence ? 0 : 0.25 },
    );
    if (observer) {
      (sequence ? [container] : videos).forEach((target) => {
        if (visibleAtMount(target, sequence)) near.add(target);
        observer.observe(target);
      });
    } else {
      (sequence ? [container] : videos.slice(0, STARTUP_LIMIT)).forEach((target) => near.add(target));
    }

    // Preparing the mounted video reuses its resource and never resets src or calls load().
    if (!criticalReady) document.fonts.ready.then(() => {
      criticalReady = true;
      update();
    });
    update();

    return () => {
      disposed = true;
      observer?.disconnect();
      if (refresh.current === update) refresh.current = null;
      videos.forEach((video) => {
        video.removeEventListener("canplay", onBuffered);
        video.preload = "none";
        delete video.dataset.videoLoadAllowed;
      });
    };
  }, [containerRef, enabled, mediaKey]);

  return useCallback((video) => video.dataset.videoLoadAllowed === "true", []);
}
