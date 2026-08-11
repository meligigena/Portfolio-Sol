import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "../../animations/gsap";
import { portfolioMediaUrl } from "../../lib/portfolioMedia";

export function StorySequence({ companionVideo = null, presentation = "singlePhone", projects }) {
  const sequenceRef = useRef(null);
  const companionVideoRef = useRef(null);
  const isDualPhone = presentation === "dualPhoneVideo" && Boolean(companionVideo);

  useEffect(() => {
    const video = companionVideoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.play()?.catch?.(() => {});

    return () => video.pause();
  }, [companionVideo]);

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

  return (
    <div
      className="case-study__story-scroll"
      data-story-presentation={isDualPhone ? "dualPhoneVideo" : "singlePhone"}
      data-story-sequence
      ref={sequenceRef}
    >
      <div className="case-study__story-pin">
        <div className="case-study__story-composition">
          {isDualPhone && (
            <figure
              className="project-media project-media--story-device project-media--story-video-device"
              data-media-kind="video"
              data-story-device
              data-story-video-device
            >
              <div className="project-media__phone">
                <div className="project-media__phone-screen">
                  <video
                    aria-label={companionVideo.alt}
                    autoPlay
                    height={companionVideo.height}
                    loop
                    muted
                    onVolumeChange={(event) => {
                      if (!event.currentTarget.muted) {
                        event.currentTarget.muted = true;
                      }
                    }}
                    playsInline
                    preload="metadata"
                    ref={companionVideoRef}
                    src={portfolioMediaUrl(companionVideo.src)}
                    width={companionVideo.width}
                  />
                </div>
                <PhoneFrame />
              </div>
              <figcaption>VIDEO</figcaption>
            </figure>
          )}
          <figure
            className="project-media project-media--story-device"
            data-media-kind="story"
            data-story-device
            data-story-image-device
          >
            <div className="project-media__phone">
              <div className="project-media__phone-screen">
                <div className="project-media__story-track" data-story-track>
                  {projects.map((project) => (
                    <div
                      className="project-media__story-slide"
                      data-story-slide
                      key={project.id}
                    >
                      {project.src ? (
                        <img
                          src={portfolioMediaUrl(project.src)}
                          alt={project.alt}
                          width={project.width}
                          height={project.height}
                          loading="lazy"
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
          </figure>
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
      aria-hidden="true"
    />
  );
}
