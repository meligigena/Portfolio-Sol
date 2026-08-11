export function shouldResetVideoStackSound(
  previousActiveIndex,
  nextActiveIndex,
  soundEnabled,
) {
  return soundEnabled && previousActiveIndex !== nextActiveIndex;
}
