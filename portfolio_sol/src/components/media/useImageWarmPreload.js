import { useEffect, useRef } from "react";

const WARM_MARGIN = "800px 0px";

export function useImageWarmPreload({ containerRef, mediaKey, activeIndex = 0, ahead = 1, enabled = true }) {
  const settings = useRef({ activeIndex, ahead });
  const refresh = useRef(null);

  useEffect(() => {
    settings.current = { activeIndex, ahead };
    refresh.current?.();
  }, [activeIndex, ahead]);

  useEffect(() => {
    const container = containerRef.current;
    const images = [...(container?.querySelectorAll("img[data-image-warm-index]") ?? [])];
    if (!enabled || !images.length) return undefined;

    let disposed = false;
    let near = false;
    let generation = 0;
    const records = new Map();
    const nativeScroller = (image) => image.closest(".project-media__phone-screen, .project-media__carousel-window, .catalog-pair__pages");
    const rowIndex = (image) => {
      const row = image.parentElement.parentElement;
      let index = settings.current.activeIndex;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        const scroller = nativeScroller(image);
        const slideWidth = row.firstElementChild?.getBoundingClientRect().width;
        if (scroller && slideWidth > 0) index = Math.floor(scroller.scrollLeft / slideWidth);
      }
      return Math.min(index, row.children.length - 1);
    };

    const release = (image, record) => {
      record.cancel();
      image.loading = "lazy";
      image.fetchPriority = "auto";
      delete image.dataset.imageWarmState;
      records.delete(image);
    };

    const prepare = (image, priority) => {
      image.fetchPriority = priority;
      image.loading = "eager";
      const existing = records.get(image);
      if (existing) return existing.promise;

      let canceled = false;
      let finishFallback;
      let decoding = false;
      const fallback = new Promise((resolve) => { finishFallback = resolve; });
      const state = (value) => {
        if (!disposed && !canceled) image.dataset.imageWarmState = value;
      };
      const decode = async () => {
        if (decoding || disposed || canceled) return;
        decoding = true;
        state("preparing");
        if (typeof image.decode === "function") {
          try {
            await image.decode();
            state("ready");
            finishFallback();
            decoding = false;
            return;
          } catch {
            // A loaded image can still paint when decode() rejects.
          }
        }
        if (image.complete) {
          state(image.naturalWidth > 0 ? "loaded" : "error");
          finishFallback();
        }
        decoding = false;
      };
      const onLoad = () => {
        if (typeof image.decode !== "function") {
          state("loaded");
          finishFallback();
        } else {
          void decode();
        }
      };
      const onError = () => { state("error"); finishFallback(); };
      image.addEventListener("load", onLoad);
      image.addEventListener("error", onError);
      const record = {
        promise: fallback,
        cancel: () => {
          canceled = true;
          image.removeEventListener("load", onLoad);
          image.removeEventListener("error", onError);
          finishFallback();
        },
      };
      records.set(image, record);

      // Assign sizes/srcset before src to avoid fetching the fallback candidate first.
      for (const [attribute, value] of [["sizes", image.dataset.imageWarmSizes], ["srcset", image.dataset.imageWarmSrcset], ["src", image.dataset.imageWarmSrc]]) {
        if (value && image.getAttribute(attribute) !== value) image.setAttribute(attribute, value);
      }
      void decode();
      return record.promise;
    };

    const update = () => {
      const turn = ++generation;
      if (disposed) return;
      const { ahead: distance } = settings.current;
      const inWindow = (image) => {
        const position = Number(image.dataset.imageWarmIndex);
        const index = rowIndex(image);
        return position >= Math.max(0, index - 1) && position <= index + distance;
      };
      for (const [image, record] of records) if (!near || !inWindow(image)) release(image, record);
      if (!near) return;

      const candidates = images.filter(inWindow);
      const critical = candidates.filter((image) => {
        const position = Number(image.dataset.imageWarmIndex);
        const index = rowIndex(image);
        return position === index || position === index + 1;
      });
      critical.forEach((image) => prepare(image, "high"));
      const active = critical.filter((image) => Number(image.dataset.imageWarmIndex) === rowIndex(image));
      candidates.filter((image) => Number(image.dataset.imageWarmIndex) < rowIndex(image) && !critical.includes(image))
        .forEach((image) => prepare(image, "auto"));
      // Start the second upcoming story after the active image settles; next stays high priority.
      Promise.allSettled(active.map((image) => records.get(image).promise)).then(() => {
        if (disposed || !near || turn !== generation) return;
        candidates.filter((image) => !critical.includes(image)).forEach((image) => prepare(image, "auto"));
      });
    };
    refresh.current = update;
    const scrollers = [...new Set(images.map(nativeScroller).filter(Boolean))];
    scrollers.forEach((scroller) => scroller.addEventListener("scroll", update, { passive: true }));

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        near = entries.some((entry) => entry.isIntersecting);
        update();
      },
      { rootMargin: WARM_MARGIN, threshold: 0 },
    );
    if (observer) {
      const target = container.querySelector("[data-story-image-device]") ?? container;
      const rect = target.getBoundingClientRect();
      near = rect.width > 0 && rect.height > 0 && rect.bottom > -800 && rect.top < window.innerHeight + 800;
      observer.observe(target);
    } else near = true;
    update();

    return () => {
      disposed = true;
      generation += 1;
      observer?.disconnect();
      scrollers.forEach((scroller) => scroller.removeEventListener("scroll", update));
      if (refresh.current === update) refresh.current = null;
      for (const [image, record] of records) release(image, record);
      // Reset admitted distant sources when a mounted section changes edition/content.
      images.forEach((image) => {
        if (Number(image.dataset.imageWarmIndex) >= 2 && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
          image.removeAttribute("src");
          image.removeAttribute("srcset");
          image.removeAttribute("sizes");
        }
      });
    };
  }, [containerRef, enabled, mediaKey]);
}
