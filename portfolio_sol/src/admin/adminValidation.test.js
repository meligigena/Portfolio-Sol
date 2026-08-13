import { describe, expect, it, vi } from "vitest";
import {
  MAX_FILE_BYTES,
  prepareFilesForUpload,
  slugifyClientName,
  validateClientDraft,
  validateFiles,
  validateFilesForUpload,
} from "./adminValidation";

function mp4Box(type, payload = new Uint8Array()) {
  const box = new Uint8Array(8 + payload.length);
  const view = new DataView(box.buffer);
  view.setUint32(0, box.length);
  box.set([...type].map((character) => character.charCodeAt(0)), 4);
  box.set(payload, 8);
  return box;
}

function videoFile({
  audioCodec = "mp4a",
  codec = "avc1",
  fastStart = true,
  name = "video.mp4",
} = {}) {
  const ftyp = mp4Box("ftyp", new TextEncoder().encode("isom0000isomavc1"));
  const sampleEntry = mp4Box(codec, new Uint8Array(32));
  const audioEntry = mp4Box(audioCodec, new Uint8Array(8));
  const moov = mp4Box("moov", new Uint8Array([...sampleEntry, ...audioEntry]));
  const mdat = mp4Box("mdat", new Uint8Array(8));
  const bytes = fastStart
    ? new Uint8Array([...ftyp, ...moov, ...mdat])
    : new Uint8Array([...ftyp, ...mdat, ...moov]);

  return new File([bytes], name, { type: "video/mp4" });
}

describe("admin client validation", () => {
  it("requires name, year, discipline and a logo for a new client", () => {
    expect(
      validateClientDraft({
        name: "",
        year: "",
        discipline: "",
        logo: null,
      }),
    ).toEqual({
      discipline: "El rubro o disciplina es obligatorio.",
      logo: "El logo es obligatorio.",
      name: "El nombre es obligatorio.",
      year: "El año es obligatorio.",
    });
  });

  it("does not require a replacement logo while editing", () => {
    expect(
      validateClientDraft(
        {
          name: "Maja",
          year: "2024",
          discipline: "Estética",
          logo: null,
          existingLogoPath: "maja/logo.png",
        },
        { editing: true },
      ),
    ).toEqual({});
  });

  it("allows an existing client to remain without a logo", () => {
    expect(
      validateClientDraft(
        {
          name: "Maja",
          year: "2024",
          discipline: "Estética",
          logo: null,
          existingLogoPath: null,
          logoRemoved: true,
        },
        { editing: true },
      ),
    ).toEqual({});
  });

  it("creates a lowercase accent-free slug", () => {
    expect(slugifyClientName("  Sistemas Móviles  ")).toBe("sistemas-moviles");
  });

  it("explains the absolute 50 MB limit in plain language for videos", () => {
    const oversized = new File([new Uint8Array(1)], "large.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });

    expect(validateFiles([oversized], ["video/mp4"])).toEqual([
      {
        file: oversized,
        message: "El video supera el máximo permitido de 50 MB.",
      },
    ]);
  });

  it("explains that an incompatible video format must be MP4", () => {
    const mov = new File([new Uint8Array(1)], "video.mov", {
      type: "video/quicktime",
    });

    expect(validateFiles([mov], ["video/mp4"])).toEqual([
      { file: mov, message: "El video debe estar en formato MP4." },
    ]);
  });

  it("accepts an MP4 whose real video sample entry is H.264 with AAC and faststart", async () => {
    await expect(
      validateFilesForUpload([videoFile()], ["video/mp4"]),
    ).resolves.toEqual([]);
  });

  it("rejects HEVC by its real codec even when the extension and MIME say MP4", async () => {
    const file = videoFile({ codec: "hvc1" });

    await expect(
      validateFilesForUpload([file], ["video/mp4"]),
    ).resolves.toEqual([
      {
        file,
        message:
          "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
      },
    ]);
  });

  it("rejects H.264 MP4 without faststart before upload", async () => {
    const file = videoFile({ fastStart: false });

    await expect(
      validateFilesForUpload([file], ["video/mp4"]),
    ).resolves.toEqual([
      {
        file,
        message:
          "El archivo necesita una exportación compatible para web. Volvé a exportarlo como MP4 H.264.",
      },
    ]);
  });

  it("keeps a compatible faststart MP4 without processing it", async () => {
    const file = videoFile();
    const fixFastStart = vi.fn();

    await expect(
      prepareFilesForUpload([file], ["video/mp4"], { fixFastStart }),
    ).resolves.toMatchObject({ errors: [], files: [file] });
    expect(fixFastStart).not.toHaveBeenCalled();
  });

  it("auto-fixes and revalidates an H.264 MP4 without faststart", async () => {
    const original = videoFile({ fastStart: false });
    const fixed = videoFile();
    const fixFastStart = vi.fn().mockResolvedValue(fixed);

    await expect(
      prepareFilesForUpload([original], ["video/mp4"], { fixFastStart }),
    ).resolves.toMatchObject({ errors: [], files: [fixed] });
    expect(fixFastStart).toHaveBeenCalledOnce();
    expect(fixFastStart).toHaveBeenCalledWith(original);
  });

  it("never auto-fixes HEVC", async () => {
    const file = videoFile({ codec: "hev1", fastStart: false });
    const fixFastStart = vi.fn();

    const result = await prepareFilesForUpload([file], ["video/mp4"], {
      fixFastStart,
    });

    expect(result.errors[0].message).toBe(
      "Este video no es compatible con el portfolio. Exportalo como MP4 en H.264 e intentá nuevamente.",
    );
    expect(fixFastStart).not.toHaveBeenCalled();
  });

  it("rejects an oversized video before auto-fixing", async () => {
    const file = videoFile({ fastStart: false });
    Object.defineProperty(file, "size", { value: MAX_FILE_BYTES + 1 });
    const fixFastStart = vi.fn();

    const result = await prepareFilesForUpload([file], ["video/mp4"], {
      fixFastStart,
    });

    expect(result.errors[0].message).toBe(
      "El video supera el máximo permitido de 50 MB.",
    );
    expect(fixFastStart).not.toHaveBeenCalled();
  });

  it("rejects an invalid container before checking its oversized payload", () => {
    const file = new File([new Uint8Array(1)], "video.mov", {
      type: "video/quicktime",
    });
    Object.defineProperty(file, "size", { value: MAX_FILE_BYTES + 1 });

    expect(validateFiles([file], ["video/mp4"])[0].message).toBe(
      "El video debe estar en formato MP4.",
    );
  });

  it("returns a simple error and no file when faststart preparation fails", async () => {
    const file = videoFile({ fastStart: false });
    const fixFastStart = vi.fn().mockRejectedValue(new Error("invalid stco"));

    const result = await prepareFilesForUpload([file], ["video/mp4"], {
      fixFastStart,
    });

    expect(result.files).toEqual([]);
    expect(result.errors).toEqual([
      {
        file,
        message:
          "No pudimos preparar este video automáticamente. Volvé a exportarlo como MP4 H.264 e intentá nuevamente.",
      },
    ]);
  });

  it("continues rejecting incompatible audio with an actionable explanation", async () => {
    const file = videoFile({ audioCodec: "ac-3" });

    await expect(
      validateFilesForUpload([file], ["video/mp4"]),
    ).resolves.toEqual([
      {
        file,
        message:
          "El audio de este video no es compatible. Volvé a exportarlo como MP4 H.264.",
      },
    ]);
  });
});
