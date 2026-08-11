export function repairDisplayHeadingText(text) {
  if (typeof text !== "string" || !/[ÃÂ]/.test(text)) return text;

  const codePoints = Array.from(text, (character) => character.codePointAt(0));
  if (codePoints.some((codePoint) => codePoint > 255)) return text;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(codePoints),
    );
  } catch {
    return text;
  }
}

export function normalizeDisplayHeadingText(text) {
  const repairedText = repairDisplayHeadingText(text);

  return typeof repairedText === "string"
    ? repairedText.normalize("NFD").replace(/\p{M}/gu, "")
    : repairedText;
}
