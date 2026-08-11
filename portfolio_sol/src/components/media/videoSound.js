export const VIDEO_SOUND_OWNER_EVENT = "portfolio:video-sound-owner";

export function claimVideoSound(ownerId) {
  window.dispatchEvent(
    new CustomEvent(VIDEO_SOUND_OWNER_EVENT, { detail: { ownerId } }),
  );
}
