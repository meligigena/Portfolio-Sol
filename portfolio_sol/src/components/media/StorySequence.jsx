import { useEffect, useId, useRef, useState } from "react";
import { gsap, useGSAP } from "../../animations/gsap";
import { portfolioMediaUrl } from "../../lib/portfolioMedia";
import { imageSequenceKey, warmImageProps } from "../../lib/imageWarmPreload";
import { useImageWarmPreload } from "./useImageWarmPreload";
import { SoundToggleButton } from "./SoundToggleButton";
import { useVideoViewportVisibility } from "./useVideoViewportVisibility";
import { claimVideoSound, VIDEO_SOUND_OWNER_EVENT } from "./videoSound";
import { useVideoWarmPreload } from "./useVideoWarmPreload";
import { usePortfolioData } from "../../data/PortfolioDataContext";

export function StorySequence({ companionVideo = null, priority = false, projects = [], videoStory = null }) {
  const sequenceRef = useRef(null);
  const ownerId = useId();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [imagePosition, setImagePosition] = useState({ key: "", index: 0 });
  const { source: dataSource } = usePortfolioData();
  const mediaReady = dataSource !== "loading";
  const resolvedVideoStory = videoStory ?? companionVideo;
  const storyProjects = projects.filter((project) => Boolean(project?.src));
  const imageSizes = "(max-width: 48rem) 86vw, 342px";
  const imageKey = imageSequenceKey([storyProjects], imageSizes);
  useImageWarmPreload({
    containerRef: sequenceRef,
    mediaKey: imageKey,
    activeIndex: imagePosition.key === imageKey ? imagePosition.index : 0,
    ahead: 2,
    enabled: mediaReady,
  });
  const hasStories = storyProjects.length > 0;
  const hasVideoStory = Boolean(resolvedVideoStory?.src);
  const isDualPhone = hasStories && hasVideoStory;
  const audioAllowed = resolvedVideoStory?.audioEnabled !== false;
  const mediaKey = `${resolvedVideoStory?.id ?? ""}:${resolvedVideoStory?.src ?? ""}`;
  const onVisible = (video) => {
    if (!canStart(video)) return;
    video.muted = !audioAllowed || !soundEnabled;
    video.play()?.catch?.(() => {});
  };
  const canStart = useVideoWarmPreload({
    containerRef: sequenceRef,
    enabled: mediaReady,
    mediaKey,
    activeIndex: 0,
    onPrepared: (video) => {
      if (video.dataset.viewportVisible === "true") onVisible(video);
    },
  });

  useVideoViewportVisibility({
    containerRef: sequenceRef,
    enabled: mediaReady,
    observeKey: mediaKey,
    onHidden: () => setSoundEnabled(false),
    onVisible,
  });

  useEffect(() => {
    const video = sequenceRef.current?.querySelector("[data-story-video-device] video");
    if (!video) return;
    video.muted =
      !audioAllowed ||
      !soundEnabled ||
      video.dataset.viewportVisible === "false";
  }, [audioAllowed, soundEnabled]);

  useEffect(() => {
    const releaseSound = (event) => {
      if (event.detail?.ownerId !== ownerId) setSoundEnabled(false);
    };
    window.addEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
    return () => window.removeEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
  }, [ownerId]);

  const toggleSound = () => {
    if (!audioAllowed) return;
    const video = sequenceRef.current?.querySelector("[data-story-video-device] video");
    const enable = !soundEnabled && video?.dataset.viewportVisible !== "false";
    if (enable) claimVideoSound(ownerId);
    if (video) {
      video.muted = !enable;
      if (enable) video.play()?.catch?.(() => {});
    }
    setSoundEnabled(enable);
  };

  useGSAP(
    () => {
      const sequence = sequenceRef.current;
      const pin = sequence?.querySelector(".case-study__story-pin");
      const storyDevice = sequence?.querySelector("[data-story-image-device]");
      const track = sequence?.querySelector("[data-story-track]");
      const slideCount = sequence?.querySelectorAll("[data-story-slide]").length ?? 0;

      if (!pin || !storyDevice || !track || slideCount < 2) {
        return;
      }

      const media = gsap.matchMedia();
      const animateTrack = (trigger, pinTarget) => {
        gsap.to(track, {
          xPercent: -100 * (slideCount - 1),
          ease: "none",
          scrollTrigger: {
            trigger,
            pin: pinTarget,
            start: "top top",
            end: () =>
              `+=${(slideCount - 1) * Math.max(window.innerHeight * 0.72, 480)}`,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const index = Math.min(slideCount - 1, Math.ceil(self.progress * (slideCount - 1)));
              setImagePosition((previous) => previous.key === imageKey && previous.index === index
                ? previous : { key: imageKey, index });
            },
          },
        });
      };

      if (isDualPhone) {
        media.add(
          "(min-width: 48.001rem) and (prefers-reduced-motion: no-preference)",
          () => animateTrack(sequence, pin),
        );
        media.add(
          "(max-width: 48rem) and (prefers-reduced-motion: no-preference)",
          () => animateTrack(storyDevice, storyDevice),
        );
      } else {
        media.add("(prefers-reduced-motion: no-preference)", () =>
          animateTrack(sequence, pin),
        );
      }

      return () => media.revert();
    },
    {
      dependencies: [isDualPhone, projects],
      scope: sequenceRef,
      revertOnUpdate: true,
    },
  );

  if (!hasStories && !hasVideoStory) return null;

  return (
    <div
      className="case-study__story-scroll"
      data-story-presentation={isDualPhone ? "dualPhone" : "singlePhone"}
      data-story-sequence
      ref={sequenceRef}
    >
      <div className="case-study__story-pin">
        <div className="case-study__story-composition">
          {hasVideoStory && (
            <figure
              className="project-media project-media--story-device project-media--story-video-device"
              data-media-kind="video"
              data-story-device
              data-story-video-device
            >
              <div className="project-media__phone">
                <div className="project-media__phone-screen">
                  <video
                    aria-label={resolvedVideoStory.alt}
                    data-audio-enabled={audioAllowed}
                    height={resolvedVideoStory.height}
                    loop
                    muted
                    onVolumeChange={(event) => {
                      if (!audioAllowed && !event.currentTarget.muted) {
                        event.currentTarget.muted = true;
                      }
                    }}
                    playsInline
                    preload="none"
                    src={portfolioMediaUrl(resolvedVideoStory.src)}
                    width={resolvedVideoStory.width}
                  />
                  {audioAllowed && (
                    <SoundToggleButton enabled={soundEnabled} onClick={toggleSound} />
                  )}
                </div>
                <PhoneFrame />
              </div>
              <figcaption>VIDEO</figcaption>
            </figure>
          )}
          {hasStories && <figure
            className="project-media project-media--story-device"
            data-media-kind="story"
            data-story-device
            data-story-image-device
          >
            <div className="project-media__phone">
              <div className="project-media__phone-screen">
                <div className="project-media__story-track" data-story-track>
                  {storyProjects.map((project, index) => (
                    <div
                      className="project-media__story-slide"
                      data-story-slide
                      key={project.id}
                    >
                      {project.src ? (
                        <img
                          {...warmImageProps(project, imageSizes, index, mediaReady)}
                          alt={project.alt}
                          width={project.width}
                          height={project.height}
                          loading={priority && index === 0 ? "eager" : "lazy"}
                          fetchPriority={priority && index === 0 ? "high" : undefined}
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="project-media__story-placeholder"
                          role="img"
                          aria-label={project.alt}
                        >
                          ASSET PENDIENTE
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <PhoneFrame />
            </div>
            <figcaption>STORY</figcaption>
          </figure>}
        </div>
      </div>
    </div>
  );
}

function PhoneFrame() {
  return (
    <img
      className="project-media__phone-frame"
      src="/iphone.png"
      alt=""
      width="360"
      height="722"
      loading="lazy"
      decoding="async"
      aria-hidden="true"
    />
  );
}
