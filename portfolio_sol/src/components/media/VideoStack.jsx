import { useEffect, useId, useRef, useState } from "react";
import { gsap, useGSAP } from "../../animations/gsap";
import { SoundToggleButton } from "./SoundToggleButton";
import { useVideoViewportVisibility } from "./useVideoViewportVisibility";
import { claimVideoSound, VIDEO_SOUND_OWNER_EVENT } from "./videoSound";
import { portfolioMediaUrl } from "../../lib/portfolioMedia";
import { shouldResetVideoStackSound } from "./videoStackSound";

export function VideoStack({ items }) {
  const stackRef = useRef(null);
  const previousActiveIndexRef = useRef(0);
  const ownerId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useVideoViewportVisibility({
    containerRef: stackRef,
    observeKey: items,
    onHidden: (video) => {
      const videos = [...(stackRef.current?.querySelectorAll("video") ?? [])];

      if (videos.indexOf(video) === activeIndex) {
        setSoundEnabled(false);
      }
    },
    onVisible: (video) => {
      const videos = [...(stackRef.current?.querySelectorAll("video") ?? [])];
      const videoIndex = videos.indexOf(video);

      if (videoIndex === activeIndex) {
        const audioAllowed = items[videoIndex]?.audioEnabled !== false;
        video.muted = !audioAllowed || !soundEnabled;
        video.play()?.catch?.(() => {});
      }
    },
  });

  useGSAP(
    () => {
      const stack = stackRef.current;
      const pin = stack?.querySelector(".case-study__video-pin");
      const slides = gsap.utils.toArray("[data-video-slide]", stack);
      const slideCount = slides.length;
      const media = gsap.matchMedia();

      setActiveIndex(0);

      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (!pin || slideCount === 0) {
          return;
        }

        gsap.set(slides, {
          yPercent: (index) => (index === 0 ? 0 : 100),
          autoAlpha: 1,
        });

        if (slideCount < 2) {
          return;
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: stack,
            pin,
            start: "top top",
            end: () =>
              `+=${(slideCount - 1) * Math.max(window.innerHeight * 0.82, 520)}`,
            scrub: 0.75,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              setActiveIndex(
                Math.min(
                  slideCount - 1,
                  Math.round(self.progress * (slideCount - 1)),
                ),
              );
            },
            onLeave: () => setActiveIndex(slideCount - 1),
            onLeaveBack: () => setActiveIndex(0),
          },
        });

        slides.slice(1).forEach((slide, index) => {
          timeline
            .to(slides[index], { yPercent: -100, ease: "none", duration: 1 })
            .to(slide, { yPercent: 0, ease: "none", duration: 1 }, "<");
        });
      });

      return () => media.revert();
    },
    { dependencies: [items], scope: stackRef, revertOnUpdate: true },
  );

  useEffect(() => {
    const videos = [...(stackRef.current?.querySelectorAll("video") ?? [])];
    const resetSound = shouldResetVideoStackSound(
      previousActiveIndexRef.current,
      activeIndex,
      soundEnabled,
    );
    previousActiveIndexRef.current = activeIndex;

    if (resetSound) {
      setSoundEnabled(false);
    }

    videos.forEach((video, index) => {
      const isActive = index === activeIndex;
      const audioAllowed = items[index]?.audioEnabled !== false;

      const isVisible = video.dataset.viewportVisible !== "false";

      video.muted =
        !audioAllowed || !isActive || !isVisible || !soundEnabled || resetSound;
      if (isActive) {
        if (isVisible) {
          video.play()?.catch?.(() => {});
        } else {
          video.pause();
        }
      } else {
        video.pause();
      }
    });

    return () => videos.forEach((video) => video.pause());
  }, [activeIndex, items, soundEnabled]);

  useEffect(() => {
    const releaseSound = (event) => {
      if (event.detail?.ownerId !== ownerId) {
        setSoundEnabled(false);
      }
    };

    window.addEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
    return () => window.removeEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
  }, [ownerId]);

  const toggleSound = () => {
    const activeItem = items[activeIndex];

    if (activeItem?.audioEnabled === false) {
      return;
    }

    const nextEnabled = !soundEnabled;
    const activeVideo = stackRef.current?.querySelectorAll("video")[activeIndex];

    if (nextEnabled && activeVideo?.dataset.viewportVisible !== "false") {
      claimVideoSound(ownerId);
      if (activeVideo) {
        activeVideo.muted = false;
        activeVideo.play()?.catch?.(() => {});
      }
    } else if (activeVideo) {
      activeVideo.muted = true;
    }

    setSoundEnabled(nextEnabled && activeVideo?.dataset.viewportVisible !== "false");
  };

  const activeAudioAllowed = items[activeIndex]?.audioEnabled !== false;

  return (
    <div className="case-study__video-stack" data-video-stack ref={stackRef}>
      <div className="case-study__video-pin">
        <div className="project-media project-media--video-stack" data-media-kind="video-stack">
          <div className="project-media__video-window">
            {items.map((item, index) => (
              <figure
                aria-hidden={index !== activeIndex}
                className="project-media__video-slide"
                data-media-kind="video"
                data-video-slide
                key={item.id}
              >
                <video
                  aria-label={item.alt}
                  data-audio-enabled={item.audioEnabled !== false}
                  height={item.height}
                  loop
                  muted={
                    item.audioEnabled === false ||
                    index !== activeIndex ||
                    !soundEnabled
                  }
                  onVolumeChange={(event) => {
                    if (item.audioEnabled === false && !event.currentTarget.muted) {
                      event.currentTarget.muted = true;
                    }
                  }}
                  playsInline
                  preload="metadata"
                  width={item.width}
                >
                  <source src={portfolioMediaUrl(item.src)} />
                </video>
                <figcaption>VIDEO</figcaption>
              </figure>
            ))}
            {activeAudioAllowed && (
              <SoundToggleButton enabled={soundEnabled} onClick={toggleSound} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
