const textDecoder = new TextDecoder("latin1");
const CONTAINER_BOX_TYPES = new Set(["moov", "trak", "mdia", "minf", "stbl"]);

function readType(view, offset) {
  return textDecoder.decode(
    new Uint8Array(view.buffer, view.byteOffset + offset, 4),
  );
}

function readBox(view, offset, end) {
  if (offset + 8 > end) return null;

  let size = view.getUint32(offset);
  const type = readType(view, offset + 4);
  let headerSize = 8;

  if (size === 1) {
    if (offset + 16 > end) throw new Error("Incomplete extended MP4 box header");
    const extendedSize = view.getBigUint64(offset + 8);
    if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("MP4 box is too large to process safely");
    }
    size = Number(extendedSize);
    headerSize = 16;
  } else if (size === 0) {
    size = end - offset;
  }

  if (size < headerSize || offset + size > end) {
    throw new Error("Invalid MP4 box size");
  }

  return {
    dataOffset: offset + headerSize,
    end: offset + size,
    offset,
    size,
    type,
  };
}

async function readTopLevelBoxes(file) {
  const boxes = [];
  let offset = 0;

  while (offset + 8 <= file.size) {
    const header = new DataView(
      await file.slice(offset, Math.min(offset + 16, file.size)).arrayBuffer(),
    );
    let size = header.getUint32(0);
    const type = readType(header, 4);
    let headerSize = 8;

    if (size === 1) {
      if (header.byteLength < 16) throw new Error("Incomplete MP4 box header");
      const extendedSize = header.getBigUint64(8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("MP4 box is too large to process safely");
      }
      size = Number(extendedSize);
      headerSize = 16;
    } else if (size === 0) {
      size = file.size - offset;
    }

    if (size < headerSize || offset + size > file.size) {
      throw new Error("Invalid top-level MP4 box");
    }

    boxes.push({ offset, size, type });
    offset += size;
  }

  if (offset !== file.size) throw new Error("Incomplete MP4 structure");
  return boxes;
}

function patchChunkOffset(offset, insertionOffset, moovOffset, moovSize) {
  if (offset >= insertionOffset && offset < moovOffset) {
    return offset + BigInt(moovSize);
  }
  if (offset >= moovOffset && offset < moovOffset + BigInt(moovSize)) {
    throw new Error("Invalid media offset inside moov box");
  }
  return offset;
}

function patchOffsetBox(view, box, context) {
  if (box.end - box.dataOffset < 8) throw new Error("Invalid chunk offset box");
  const entryCount = view.getUint32(box.dataOffset + 4);
  const entrySize = box.type === "stco" ? 4 : 8;
  const entriesOffset = box.dataOffset + 8;

  if (entriesOffset + entryCount * entrySize > box.end) {
    throw new Error("Invalid chunk offset table");
  }

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesOffset + index * entrySize;
    const current = box.type === "stco"
      ? BigInt(view.getUint32(entryOffset))
      : view.getBigUint64(entryOffset);
    const next = patchChunkOffset(
      current,
      BigInt(context.insertionOffset),
      BigInt(context.moovOffset),
      context.moovSize,
    );

    if (box.type === "stco") {
      if (next > 0xffffffffn) throw new Error("32-bit chunk offset overflow");
      view.setUint32(entryOffset, Number(next));
    } else {
      view.setBigUint64(entryOffset, next);
    }
  }
}

function patchContainer(view, start, end, context, depth = 0) {
  if (depth > 10) throw new Error("MP4 boxes are nested too deeply");

  let offset = start;
  while (offset + 8 <= end) {
    const box = readBox(view, offset, end);
    if (!box) break;

    if (box.type === "cmov") throw new Error("Compressed moov is not supported");
    if (box.type === "stco" || box.type === "co64") {
      patchOffsetBox(view, box, context);
    } else if (CONTAINER_BOX_TYPES.has(box.type)) {
      patchContainer(view, box.dataOffset, box.end, context, depth + 1);
    }
    offset = box.end;
  }
}

export async function fastStartMp4(file) {
  const boxes = await readTopLevelBoxes(file);
  const ftyp = boxes.find((box) => box.type === "ftyp");
  const moovBoxes = boxes.filter((box) => box.type === "moov");
  const firstMdat = boxes.find((box) => box.type === "mdat");

  if (!ftyp || moovBoxes.length !== 1 || !firstMdat) {
    throw new Error("Required MP4 boxes are missing");
  }

  const moov = moovBoxes[0];
  if (moov.offset < firstMdat.offset) return file;

  const insertionOffset = ftyp.offset + ftyp.size;
  if (insertionOffset > moov.offset) throw new Error("Unsupported MP4 box order");

  const moovBytes = new Uint8Array(
    await file.slice(moov.offset, moov.offset + moov.size).arrayBuffer(),
  );
  const moovView = new DataView(moovBytes.buffer);
  const moovHeader = readBox(moovView, 0, moovBytes.byteLength);
  if (!moovHeader || moovHeader.type !== "moov") throw new Error("Invalid moov box");

  patchContainer(moovView, moovHeader.dataOffset, moovHeader.end, {
    insertionOffset,
    moovOffset: moov.offset,
    moovSize: moov.size,
  });

  return new File(
    [
      file.slice(0, insertionOffset),
      moovBytes,
      file.slice(insertionOffset, moov.offset),
      file.slice(moov.offset + moov.size),
    ],
    file.name,
    { lastModified: file.lastModified, type: "video/mp4" },
  );
}
