import { useEffect, useId, useRef, useState } from "react";
import { SoundToggleButton } from "./SoundToggleButton";
import { useVideoViewportVisibility } from "./useVideoViewportVisibility";
import { claimVideoSound, VIDEO_SOUND_OWNER_EVENT } from "./videoSound";
import { portfolioMediaUrl } from "../../lib/portfolioMedia";

export function MediaRows({ rows }) {
  const rowsRef = useRef(null);
  const ownerId = useId();
  const [activeSoundId, setActiveSoundId] = useState(null);

  useVideoViewportVisibility({
    containerRef: rowsRef,
    observeKey: rows,
    onHidden: (video) => {
      if (video.dataset.stripVideo === activeSoundId) {
        setActiveSoundId(null);
      }
    },
    onVisible: (video) => {
      const audioAllowed = video.dataset.audioEnabled === "true";
      const hasSound = audioAllowed && video.dataset.stripVideo === activeSoundId;

      video.muted = !hasSound;
      video.play()?.catch?.(() => {});
    },
  });

  useEffect(() => {
    const videos = [...(rowsRef.current?.querySelectorAll("video") ?? [])];

    videos.forEach((video) => {
      video.muted = true;
      video.play()?.catch?.(() => {});
    });

    return () => videos.forEach((video) => video.pause());
  }, [rows]);

  useEffect(() => {
    const videos = [...(rowsRef.current?.querySelectorAll("video") ?? [])];

    videos.forEach((video) => {
      video.muted =
        video.dataset.audioEnabled !== "true" ||
        video.dataset.viewportVisible === "false" ||
        video.dataset.stripVideo !== activeSoundId;
    });
  }, [activeSoundId]);

  useEffect(() => {
    const releaseSound = (event) => {
      if (event.detail?.ownerId !== ownerId) {
        setActiveSoundId(null);
      }
    };

    window.addEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
    return () => window.removeEventListener(VIDEO_SOUND_OWNER_EVENT, releaseSound);
  }, [ownerId]);

  const toggleSound = (item) => {
    if (item.audioEnabled === false) {
      return;
    }

    if (activeSoundId === item.id) {
      setActiveSoundId(null);
      return;
    }

    claimVideoSound(ownerId);
    const video = [...(rowsRef.current?.querySelectorAll("video") ?? [])].find(
      (media) => media.dataset.stripVideo === item.id,
    );

    if (video?.dataset.viewportVisible !== "false") {
      video.muted = false;
      video.play()?.catch?.(() => {});
    }
    setActiveSoundId(
      video?.dataset.viewportVisible === "false" ? null : item.id,
    );
  };

  return (
    <div className="case-study__media-rows" ref={rowsRef}>
      {rows.map((items, rowIndex) => (
        <div
          className="case-study__media-row-viewport"
          aria-label={`Fila ${rowIndex + 1} de piezas`}
          key={items.map((item) => item.id).join("-")}
          tabIndex={0}
        >
          <div
            className="case-study__media-row"
            data-media-row
            style={{ "--media-count": items.length }}
          >
            {items.map((item) => {
              const audioAllowed = item.audioEnabled !== false;
              const hasSound = audioAllowed && activeSoundId === item.id;

              return (
                <div className="case-study__media-row-cell" key={item.id}>
                  <video
                    aria-label={item.alt}
                    autoPlay
                    className="case-study__media-row-item"
                    data-audio-enabled={audioAllowed}
                    data-strip-video={item.id}
                    height={item.height}
                    loop
                    muted={!hasSound}
                    onVolumeChange={(event) => {
                      if (!audioAllowed && !event.currentTarget.muted) {
                        event.currentTarget.muted = true;
                      }
                    }}
                    playsInline
                    preload="metadata"
                    width={item.width}
                  >
                    <source src={portfolioMediaUrl(item.src)} />
                  </video>
                  {audioAllowed && (
                    <SoundToggleButton
                      enabled={hasSound}
                      onClick={() => toggleSound(item)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
