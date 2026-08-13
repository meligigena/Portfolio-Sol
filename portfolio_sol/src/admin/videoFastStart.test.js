import { describe, expect, it } from "vitest";
import { inspectMp4Video } from "./videoCompatibility";
import { fastStartMp4 } from "./videoFastStart";

function mp4Box(type, payload = new Uint8Array()) {
  const box = new Uint8Array(8 + payload.length);
  const view = new DataView(box.buffer);
  view.setUint32(0, box.length);
  box.set([...type].map((character) => character.charCodeAt(0)), 4);
  box.set(payload, 8);
  return box;
}

function concat(...parts) {
  return new Uint8Array(parts.flatMap((part) => [...part]));
}

function capCutLikeVideo() {
  const ftyp = mp4Box("ftyp", new TextEncoder().encode("isom0000isomavc1"));
  const mdatPayload = new Uint8Array([11, 22, 33, 44, 55, 66]);
  const mdat = mp4Box("mdat", mdatPayload);
  const chunkOffset = ftyp.length + 8;
  const stcoPayload = new Uint8Array(12);
  const stcoView = new DataView(stcoPayload.buffer);
  stcoView.setUint32(4, 1);
  stcoView.setUint32(8, chunkOffset);
  const stbl = mp4Box(
    "stbl",
    concat(
      mp4Box("avc1", new Uint8Array(32)),
      mp4Box("mp4a", new Uint8Array(8)),
      mp4Box("stco", stcoPayload),
    ),
  );
  const moov = mp4Box(
    "moov",
    mp4Box("trak", mp4Box("mdia", mp4Box("minf", stbl))),
  );
  const file = new File([concat(ftyp, mdat, moov)], "capcut-export.mp4", {
    lastModified: 1_720_000_000_000,
    type: "video/mp4",
  });

  return { chunkOffset, file, mdatPayload, moovSize: moov.length };
}

function readChunkOffset(fileBytes) {
  const type = new TextEncoder().encode("stco");
  const typeOffset = fileBytes.findIndex((_value, index) =>
    type.every((byte, byteIndex) => fileBytes[index + byteIndex] === byte),
  );
  return new DataView(fileBytes.buffer).getUint32(typeOffset + 12);
}

describe("MP4 faststart remux", () => {
  it("moves moov before mdat, patches chunk offsets and preserves media bytes", async () => {
    const { chunkOffset, file, mdatPayload, moovSize } = capCutLikeVideo();

    await expect(inspectMp4Video(file)).resolves.toMatchObject({
      codec: "h264",
      fastStart: false,
    });

    const output = await fastStartMp4(file);
    const outputBytes = new Uint8Array(await output.arrayBuffer());

    expect(output).toBeInstanceOf(File);
    expect(output).not.toBe(file);
    expect(output.name).toBe(file.name);
    expect(output.type).toBe("video/mp4");
    expect(output.lastModified).toBe(file.lastModified);
    expect(output.size).toBe(file.size);
    expect(readChunkOffset(outputBytes)).toBe(chunkOffset + moovSize);
    const mdatPayloadOffset = outputBytes.findIndex((_value, index) =>
      mdatPayload.every(
        (byte, byteIndex) => outputBytes[index + byteIndex] === byte,
      ),
    );
    expect(mdatPayloadOffset).toBeGreaterThan(-1);
    await expect(inspectMp4Video(output)).resolves.toMatchObject({
      audioCodec: "aac",
      codec: "h264",
      fastStart: true,
    });
  });
});
