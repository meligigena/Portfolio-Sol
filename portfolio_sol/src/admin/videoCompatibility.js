const textDecoder = new TextDecoder("latin1");
const inspectionCache = new WeakMap();

export const VIDEO_COMPATIBILITY_MESSAGES = {
  hevc:
    "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
  h264Required:
    "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
  mp4Required: "El video debe estar en formato MP4.",
  aacRequired:
    "El audio de este video no es compatible. Volvé a exportarlo como MP4 H.264.",
  fastStartRequired:
    "El archivo necesita una exportación compatible para web. Volvé a exportarlo como MP4 H.264.",
};

function readType(view, offset) {
  return textDecoder.decode(
    new Uint8Array(view.buffer, view.byteOffset + offset, 4),
  );
}

async function readTopLevelBoxes(file) {
  const boxes = [];
  let offset = 0;

  while (offset + 8 <= file.size) {
    const headerBuffer = await file.slice(offset, offset + 16).arrayBuffer();
    const view = new DataView(headerBuffer);
    let size = view.getUint32(0);
    const type = readType(view, 4);
    let headerSize = 8;

    if (size === 1 && view.byteLength >= 16) {
      const extendedSize = Number(view.getBigUint64(8));
      if (!Number.isSafeInteger(extendedSize)) break;
      size = extendedSize;
      headerSize = 16;
    } else if (size === 0) {
      size = file.size - offset;
    }

    if (size < headerSize || offset + size > file.size) break;
    boxes.push({ type, offset, size, dataOffset: offset + headerSize });
    offset += size;
  }

  return boxes;
}

function containsType(view, type) {
  const needle = [...type].map((character) => character.charCodeAt(0));

  for (let offset = 4; offset <= view.byteLength - needle.length; offset += 1) {
    if (needle.every((value, index) => view.getUint8(offset + index) === value)) {
      const declaredSize = view.getUint32(offset - 4);
      if (declaredSize >= 8 && offset - 4 + declaredSize <= view.byteLength) {
        return offset - 4;
      }
    }
  }

  return -1;
}

export async function inspectMp4Video(file) {
  if (inspectionCache.has(file)) return inspectionCache.get(file);

  const inspection = await inspectMp4File(file);
  inspectionCache.set(file, inspection);
  return inspection;
}

async function inspectMp4File(file) {
  const boxes = await readTopLevelBoxes(file);
  const ftyp = boxes.find((box) => box.type === "ftyp");
  const moov = boxes.find((box) => box.type === "moov");
  const mdat = boxes.find((box) => box.type === "mdat");
  const moovBuffer = moov
    ? await file.slice(moov.offset, moov.offset + moov.size).arrayBuffer()
    : new ArrayBuffer(0);
  const view = new DataView(moovBuffer);
  const h264Offset = Math.max(containsType(view, "avc1"), containsType(view, "avc3"));
  const hevcOffset = Math.max(containsType(view, "hvc1"), containsType(view, "hev1"));
  const aacOffset = containsType(view, "mp4a");
  const incompatibleAudioOffset = Math.max(
    containsType(view, "ac-3"),
    containsType(view, "ec-3"),
    containsType(view, "Opus"),
    containsType(view, "alac"),
  );
  const width = h264Offset >= 0 && h264Offset + 32 <= view.byteLength
    ? view.getUint16(h264Offset + 32)
    : null;
  const height = h264Offset >= 0 && h264Offset + 34 <= view.byteLength
    ? view.getUint16(h264Offset + 34)
    : null;

  return {
    container: ftyp ? "mp4" : "unknown",
    codec: hevcOffset >= 0 ? "hevc" : h264Offset >= 0 ? "h264" : "unknown",
    audioCodec:
      aacOffset >= 0
        ? "aac"
        : incompatibleAudioOffset >= 0
          ? "incompatible"
          : "none",
    fastStart: Boolean(moov && mdat && moov.offset < mdat.offset),
    width: width || null,
    height: height || null,
  };
}

export async function validateVideoCompatibility(
  file,
  { requireFastStart = true } = {},
) {
  if (file.type !== "video/mp4" || !file.name.toLowerCase().endsWith(".mp4")) {
    return VIDEO_COMPATIBILITY_MESSAGES.mp4Required;
  }

  const details = await inspectMp4Video(file);
  if (details.container !== "mp4") return VIDEO_COMPATIBILITY_MESSAGES.mp4Required;
  if (details.codec === "hevc") return VIDEO_COMPATIBILITY_MESSAGES.hevc;
  if (details.codec !== "h264") return VIDEO_COMPATIBILITY_MESSAGES.h264Required;
  if (details.audioCodec === "incompatible") {
    return VIDEO_COMPATIBILITY_MESSAGES.aacRequired;
  }
  if (requireFastStart && !details.fastStart) {
    return VIDEO_COMPATIBILITY_MESSAGES.fastStartRequired;
  }
  return null;
}
